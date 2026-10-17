import ITeam from '../types/team.js';
export default interface IGetTeamsResponse {
  totalTeams: number;
  teams: ITeam[];
}
