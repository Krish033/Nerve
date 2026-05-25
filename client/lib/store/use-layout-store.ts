import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SidebarPlacement = 'left' | 'right' | 'top' | 'bottom' | 'floating';

interface LayoutState {
  sidebarPlacement: SidebarPlacement;
  hideSidebarIcons: boolean;
  hideNavbar: boolean;
  hideSidebarMenus: boolean;
  hideNavbarSearch: boolean;
  compactSidebar: boolean;
  contentMaxWidth: 'full' | 'prose';
  stickyNavbar: boolean;
  showBreadcrumbs: boolean;
  
  setSidebarPlacement: (placement: SidebarPlacement) => void;
  setHideSidebarIcons: (hide: boolean) => void;
  setHideNavbar: (hide: boolean) => void;
  setHideSidebarMenus: (hide: boolean) => void;
  setHideNavbarSearch: (hide: boolean) => void;
  setCompactSidebar: (compact: boolean) => void;
  setContentMaxWidth: (width: 'full' | 'prose') => void;
  setStickyNavbar: (sticky: boolean) => void;
  setShowBreadcrumbs: (show: boolean) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      sidebarPlacement: 'left',
      hideSidebarIcons: false,
      hideNavbar: false,
      hideSidebarMenus: false,
      hideNavbarSearch: false,
      compactSidebar: false,
      contentMaxWidth: 'full',
      stickyNavbar: true,
      showBreadcrumbs: true,
      
      setSidebarPlacement: (placement) => set({ sidebarPlacement: placement }),
      setHideSidebarIcons: (hide) => set({ hideSidebarIcons: hide }),
      setHideNavbar: (hide) => set({ hideNavbar: hide }),
      setHideSidebarMenus: (hide) => set({ hideSidebarMenus: hide }),
      setHideNavbarSearch: (hide) => set({ hideNavbarSearch: hide }),
      setCompactSidebar: (compact) => set({ compactSidebar: compact }),
      setContentMaxWidth: (width) => set({ contentMaxWidth: width }),
      setStickyNavbar: (sticky) => set({ stickyNavbar: sticky }),
      setShowBreadcrumbs: (show) => set({ showBreadcrumbs: show }),
    }),
    {
      name: 'nerve-layout-storage',
    }
  )
);
