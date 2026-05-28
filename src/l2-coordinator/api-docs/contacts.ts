export interface Contact {
  userName: string;
  alias: string;
  remark: string;
  nickName: string;
  isFriend: boolean;
}

export interface Session {
  userName: string;
  nOrder: number;
  nickName: string;
  content: string;
  nTime: number;
}

export interface ChatRoomUser {
  userName: string;
  displayName: string;
}

export interface ChatRoom {
  name: string;
  owner: string;
  users: ChatRoomUser[];
  remark: string;
  nickName: string;
}

export interface ContactsResponse {
  contacts: Contact[];
  sessions: Session[];
  chatRooms: ChatRoom[];
}
