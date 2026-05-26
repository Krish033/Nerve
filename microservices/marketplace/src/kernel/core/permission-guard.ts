/**
 * PERMISSION GUARD
 * 
 * NestJS guards and middleware for enforcing RBAC.
 * Can be used as decorator, guard, or middleware.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PermissionSystem } from './permission-system';
import { UserContext, ResourceContext } from '../contracts/module.contract';

// Metadata keys
export const PERMISSIONS_KEY = 'permissions';
export const PUBLIC_KEY = 'isPublic';
export const RESOURCE_KEY = 'resource';

interface AuthenticatedRequest extends Request {
  user?: UserContext;
}

/**
 * Permission decorator for controllers/methods
 */
export function RequirePermissions(...permissions: string[]) {
  return function (
    target: any,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) {
    if (descriptor) {
      // Method decorator
      const existingPermissions = Reflect.getMetadata(PERMISSIONS_KEY, descriptor.value) || [];
      Reflect.defineMetadata(
        PERMISSIONS_KEY,
        [...existingPermissions, ...permissions],
        descriptor.value,
      );
    } else {
      // Class decorator
      const existingPermissions = Reflect.getMetadata(PERMISSIONS_KEY, target) || [];
      Reflect.defineMetadata(
        PERMISSIONS_KEY,
        [...existingPermissions, ...permissions],
        target,
      );
    }
  };
}

/**
 * Resource decorator for defining resource context
 */
export function Resource(type: string, idParam?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(
      RESOURCE_KEY,
      { type, idParam },
      descriptor.value,
    );
  };
}

/**
 * Public decorator - no authentication required
 */
export function Public() {
  return function (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) {
    if (descriptor) {
      Reflect.defineMetadata(PUBLIC_KEY, true, descriptor.value);
    } else {
      Reflect.defineMetadata(PUBLIC_KEY, true, target);
    }
  };
}

/**
 * Permission Guard - Route protection
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private readonly permissionSystem: PermissionSystem,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.isPublic(context);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = this.extractUser(request);

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Get required permissions
    const requiredPermissions = this.getRequiredPermissions(context);

    if (requiredPermissions.length === 0) {
      // No specific permissions required, just need to be authenticated
      return true;
    }

    // Build resource context
    const resource = this.buildResourceContext(context, request);

    // Check all required permissions
    for (const permission of requiredPermissions) {
      const allowed = await this.permissionSystem.can(user, permission, resource);

      if (!allowed) {
        this.logger.warn(
          `Permission denied: ${user.id} attempted ${permission} on ${resource.type}`,
        );
        throw new ForbiddenException(
          `Permission denied: ${permission}`,
        );
      }
    }

    return true;
  }

  private isPublic(context: ExecutionContext): boolean {
    // Check method-level metadata
    const isMethodPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isMethodPublic) return true;

    // Check class-level metadata
    const isClassPublic = this.reflector.get<boolean>(PUBLIC_KEY, context.getClass());

    return isClassPublic || false;
  }

  private getRequiredPermissions(context: ExecutionContext): string[] {
    // Get method-level permissions
    const methodPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
    ]) || [];

    // Get class-level permissions
    const classPermissions = this.reflector.get<string[]>(PERMISSIONS_KEY, context.getClass()) || [];

    return [...classPermissions, ...methodPermissions];
  }

  private extractUser(request: AuthenticatedRequest): UserContext | null {
    // Extract user from request (set by auth middleware)
    if (request.user) {
      return request.user;
    }

    // Try to extract from JWT token if present
    const authHeader = request.headers.authorization;
    if (authHeader) {
      // This would normally decode the JWT
      // For now, return null if not already set by auth middleware
      return null;
    }

    return null;
  }

  private buildResourceContext(
    context: ExecutionContext,
    request: AuthenticatedRequest,
  ): ResourceContext {
    const resourceMeta = this.reflector.get<{ type: string; idParam?: string }>(
      RESOURCE_KEY,
      context.getHandler(),
    );

    const user = request.user;
    const params = request.params;

    const resource: ResourceContext = {
      type: resourceMeta?.type || 'general',
      tenantId: user?.tenantId,
    };

    // Extract resource ID if specified
    if (resourceMeta?.idParam && params[resourceMeta.idParam]) {
      const paramValue = params[resourceMeta.idParam];
      resource.id = Array.isArray(paramValue) ? paramValue[0] : paramValue;
    }

    // Extract owner ID from resource (would need database lookup in real implementation)
    // For now, assume resource ID format includes owner
    if (resource.id?.includes(':')) {
      const parts = resource.id.split(':');
      if (parts.length >= 2) {
        resource.ownerId = parts[1];
      }
    }

    return resource;
  }
}

/**
 * Permission Middleware - Request-level permission checking
 */
@Injectable()
export class PermissionMiddleware {
  private readonly logger = new Logger(PermissionMiddleware.name);

  constructor(private readonly permissionSystem: PermissionSystem) {}

  async use(req: AuthenticatedRequest, res: any, next: () => void): Promise<void> {
    // Add permission check helper to request
    req.checkPermission = async (permission: string, resource: ResourceContext): Promise<boolean> => {
      const user = req.user;
      if (!user) {
        throw new UnauthorizedException('Authentication required');
      }

      const allowed = await this.permissionSystem.can(user, permission, resource);
      return allowed;
    };

    // Add require permission helper
    req.requirePermission = async (permission: string, resource: ResourceContext): Promise<void> => {
      const allowed = await req.checkPermission!(permission, resource);
      if (!allowed) {
        throw new ForbiddenException(`Permission denied: ${permission}`);
      }
    };

    next();
  }
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: UserContext;
      checkPermission?: (permission: string, resource: ResourceContext) => Promise<boolean>;
      requirePermission?: (permission: string, resource: ResourceContext) => Promise<void>;
    }
  }
}

/**
 * Role Guard - Role-based access control
 */
@Injectable()
export class RoleGuard implements CanActivate {
  private readonly logger = new Logger(RoleGuard.name);

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const hasRole = user.roles?.some((role) => requiredRoles.includes(role));

    if (!hasRole) {
      this.logger.warn(
        `Role denied: ${user.id} needs one of ${requiredRoles.join(', ')}`,
      );
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }
}

/**
 * Role decorator
 */
export function Roles(...roles: string[]) {
  return function (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) {
    if (descriptor) {
      Reflect.defineMetadata('roles', roles, descriptor.value);
    } else {
      Reflect.defineMetadata('roles', roles, target);
    }
  };
}

/**
 * Tenant Guard - Ensure tenant access
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Get tenant from request
    const tenantId = request.headers['x-tenant-id'] || request.params.tenantId;

    if (!tenantId) {
      // No tenant specified, that's okay for some routes
      return true;
    }

    // Check if user has access to this tenant
    if (user.tenantId && user.tenantId !== tenantId) {
      this.logger.warn(
        `Tenant access denied: ${user.id} attempted access to ${tenantId}`,
      );
      throw new ForbiddenException('Tenant access denied');
    }

    return true;
  }
}
