interface IBaseEvent {
  timestamp: string;
  serverId: string;
}

export interface IChatEvent extends IBaseEvent {
  type: 'chat';
  username: string;
  message: string;
}

export interface IJoinEvent extends IBaseEvent {
  type: 'join';
  username: string;
  ipAddress: string;
}

export type IProbeEvent = IChatEvent | IJoinEvent;