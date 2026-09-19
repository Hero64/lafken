import type { Services } from '@lafken/common';

export interface RoleProps {
  /**
   * List of services for enable permissions in role
   */
  services: Services[];
  /**
   * Role name
   */
  name: string;
  /**
   * Reference to aws service
   */
  principal?: string;
}
