export default interface CommandExecution {
  id?: number;
  commandName: string;
  command: string;
  serverId: string;
  completedAt?: Date;
  triggerKey?: string;
  state?: string;
}