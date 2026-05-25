import axios from 'axios';
import { useAuthStore } from '@/lib/store/useAuth';

export interface GoogleContact {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
}

interface PeopleConnection {
  resourceName?: string;
  names?: { displayName?: string }[];
  emailAddresses?: { value?: string }[];
  photos?: { url?: string }[];
}

export class GoogleContactsService {
  static async fetchContacts(): Promise<GoogleContact[]> {
    const { googleAccessToken } = useAuthStore.getState();
    
    if (!googleAccessToken) {
      console.warn('Google Contacts: No access token available. Log out and log back in with Google to enable contact sync.');
      return [];
    }

    try {
      const response = await axios.get('https://people.googleapis.com/v1/people/me/connections', {
        params: {
          personFields: 'names,emailAddresses,photos',
          pageSize: 100,
        },
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
        },
      });

      const connections = (response.data.connections || []) as PeopleConnection[];
      
      return connections.map((person) => {
        const name = person.names?.[0]?.displayName || 'Unknown';
        const email = person.emailAddresses?.[0]?.value || '';
        const photoUrl = person.photos?.[0]?.url || '';
        const id = person.resourceName?.split('/')[1] || Date.now().toString();

        return { id, name, email, photoUrl };
      }).filter((contact: GoogleContact) => contact.email !== '');

    } catch (error: unknown) {
      const status = typeof error === 'object' && error !== null && 'response' in error
        ? (error as { response?: { status?: number } }).response?.status
        : undefined;
      if (status === 403) {
        console.error('Google People API returned 403. Make sure the People API is enabled in your Google Cloud Console: https://console.cloud.google.com/apis/library/people.googleapis.com');
      } else if (status === 401) {
        console.error('Google token expired. Please log out and log back in with Google.');
      } else {
        console.error('Error fetching Google contacts:', error);
      }
      return [];
    }
  }
}


