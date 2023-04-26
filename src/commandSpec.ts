export interface IRewardCommand {
  type: 'reward';
  username: string;
  items: { itemSpec: string, quantity: number }[];
  message?: string;
  messageRaw?: boolean;
}

export type ICommand = IRewardCommand;