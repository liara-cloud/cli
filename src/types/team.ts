export default interface ITeam {
  _id: string;
  name: string;
  color: string;
}

export interface ITeamPermissionRef {
  type: string;
  name: string;
}

export interface ITeamPermission extends ITeamPermissionRef {
  available: boolean;
  availableForRBAC: boolean;
  availableForDAC: boolean;
}

export interface ITeamUser {
  fullname: string;
  email: string;
  avatar: string;
}

export interface ITeamMember {
  _id: string;
  user: ITeamUser;
  role: { _id: string; name: string };
  createdAt: string;
}

export interface ITeamRole {
  _id: string;
  name: string;
  isCustom: boolean;
  permissions: ITeamPermissionRef[];
}

export interface ITeamInvitation {
  _id: string;
  email: string;
  // Null when the invited role has been deleted.
  role: { name: string } | null;
  status: string;
  createdAt: string;
}

export interface ITeamAssignedPermission extends ITeamPermissionRef {
  _id: string;
  member: { _id: string; user: ITeamUser };
  // The populated resource, under the key matching `type` (e.g. `project`).
  [resource: string]: any;
}

export interface ITeamInvitationInfo {
  teamID: string;
  teamName: string;
  teamColor: string;
  roleID: string;
  roleName: string;
}
