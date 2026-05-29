import React, { useState, useEffect, useRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  SentIcon,
  MicIcon,
  SmileIcon,
  Attachment01Icon,
  MoreVertical,
  CallIcon,
  VideoIcon,
  UserIcon,
  UserGroupIcon,
  CheckmarkCircle02Icon,
  TickDoubleIcon,
  ArrowLeft01Icon,
  RobotIcon,
  PlusSignIcon,
  Loading03Icon,
  Delete02Icon,
  Alert01Icon,
  Mail01Icon,
  ShieldCheck,
  Reply,
  Cancel01Icon,
  CancelCircleIcon,
  VolumeHighIcon,
  VolumeMuteIcon
} from '@hugeicons/core-free-icons';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MainLayout } from '@/components/layout/MainLayout';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { ActionConfirmModal } from '@/components/ActionConfirmModal';
import { UserProfileDialog, ProfileInfoItem } from '@/components/UserProfileDialog';


export default function MessagingPage() {
  const { user, socket, setUnreadMessagesCount, isMuted, setIsMuted, playGlobalSound, setActiveChatId } = useAppContext();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteGroupModalOpen, setIsDeleteGroupModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [reactionMenu, setReactionMenu] = useState<{msgId: number, x: number, y: number} | null>(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState<any>(null);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [activeActionsId, setActiveActionsId] = useState<number | null>(null);
  const longPressTimer = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  // Group Management State
  const [isManagingMembers, setIsManagingMembers] = useState(false);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [groupRole, setGroupRole] = useState<'Admin' | 'Member'>('Member');
  const [isAddingToGroup, setIsAddingToGroup] = useState(false);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [groupSearchResults, setGroupSearchResults] = useState<any[]>([]);
  
  const commonEmojis = ['😊', '😂', '👍', '❤️', '🔥', '🙌', '😮', '😢', '💯', '✨', '🙏', '👏', '🎉', '💡', '🚀', '✅', '❌', '🤔', '👀', '💪'];

  useEffect(() => {
    fetchConversations();
  }, []);

  const viewProfile = async (userId: number) => {
    if (!userId) return;
    try {
      const response = await axios.get(`/api/users/${userId}/profile`);
      setSelectedUserProfile(response.data);
      setIsUserProfileOpen(true);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error('Could not load user profile');
    }
  };

  useEffect(() => {
    if (activeChat && socket) {
      console.log('Joining chat room:', activeChat.id);
      fetchHistory(activeChat.id);
      socket.emit('join_chat', { chat_id: activeChat.id });
      socket.emit('mark_read', { user_id: user.id, chat_id: activeChat.id });
      
      // Optimistic UI: Clear unread count for this chat immediately
      setConversations(prev => prev.map(c => 
        c.id === activeChat.id ? { ...c, unread_count: 0 } : c
      ));

      // Fetch group details if group
      if (activeChat.type === 'group') {
        fetchGroupMembers(activeChat.id.split('_')[1]);
      }
    }
    setReplyingTo(null);
  }, [activeChat, socket, user.id]);

  useEffect(() => {
    setActiveChatId(activeChat?.id || null);
    return () => {
      setActiveChatId(null);
    };
  }, [activeChat, setActiveChatId]);

  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (msg: any) => {
      console.log('Socket: Received new_message', msg);
      const isChatActive = activeChat && (
        (msg.group_id && `group_${msg.group_id}` === activeChat.id) ||
        (!msg.group_id && (`dm_${msg.sender_id}` === activeChat.id || `dm_${msg.receiver_id}` === activeChat.id))
      );

      if (isChatActive) {
        setMessages(prev => [...prev, msg]);
        socket.emit('mark_read', { user_id: user.id, chat_id: activeChat.id });
      }
      
      if (isChatActive && msg.sender_id !== user.id) {
          playGlobalSound('message');
      }
      
      // Update sidebar conversations list locally to avoid race condition
      setConversations(prev => {
        const convId = msg.group_id ? `group_${msg.group_id}` : (msg.sender_id === user.id ? `dm_${msg.receiver_id}` : `dm_${msg.sender_id}`);
        const existingIdx = prev.findIndex(c => c.id === convId);
        if (existingIdx > -1) {
          const updated = [...prev];
          const conv = updated[existingIdx];
          
          updated[existingIdx] = {
            ...conv,
            last_message: msg,
            unread_count: isChatActive ? 0 : (conv.unread_count || 0) + (msg.sender_id !== user.id ? 1 : 0)
          };
          
          // Move to top
          const [moved] = updated.splice(existingIdx, 1);
          return [moved, ...updated];
        } else {
          // If conversation doesn't exist, fetch to load it
          fetchConversations();
          return prev;
        }
      });
    };

    const onUnreadUpdate = () => {
      fetchConversations();
    };

    const onTypingStatus = (data: any) => {
      if (activeChat && data.chat_id === activeChat.id) {
        setPartnerTyping(data.status === 'start');
      }
    };

    const onMessagesRead = (data: any) => {
      if (activeChat && data.chat_id === activeChat.id) {
        setMessages(prev => prev.map(m => m.sender_id === user.id ? { ...m, read_at: new Date().toISOString() } : m));
      }
    };

    const onMessageReacted = (data: any) => {
      if (activeChat && data.chat_id === activeChat.id) {
        setMessages(prev => prev.map(m => m.id === data.message_id ? { ...m, reactions: data.reactions } : m));
      }
    };

    const onUserPresence = (data: any) => {
      const isOnline = data.status === 'online';
      setConversations(prev => prev.map(c => 
        c.id === `dm_${data.user_id}` 
          ? { ...c, other_user: { ...c.other_user, is_online: isOnline, last_seen_at: isOnline ? new Date().toISOString() : c.other_user.last_seen_at } } 
          : c
      ));

      setActiveChat((prev: any) => {
        if (prev && prev.type === 'direct' && prev.other_user.id === data.user_id) {
          return { ...prev, other_user: { ...prev.other_user, is_online: isOnline, last_seen_at: isOnline ? new Date().toISOString() : prev.other_user.last_seen_at } };
        }
        return prev;
      });
    };

    const onConnect = () => {
      console.log('Socket reconnected, re-joining chat...');
      if (activeChat) {
        socket.emit('join_chat', { chat_id: activeChat.id });
      }
    };

    socket.on('new_message', onNewMessage);
    socket.on('unread_update', onUnreadUpdate);
    socket.on('typing_status', onTypingStatus);
    socket.on('messages_read', onMessagesRead);
    socket.on('message_reacted', onMessageReacted);
    socket.on('user_presence', onUserPresence);
    socket.on('connect', onConnect);

    return () => {
      socket.off('new_message', onNewMessage);
      socket.off('unread_update', onUnreadUpdate);
      socket.off('typing_status', onTypingStatus);
      socket.off('messages_read', onMessagesRead);
      socket.off('message_reacted', onMessageReacted);
      socket.off('user_presence', onUserPresence);
      socket.off('connect', onConnect);
    };
  }, [socket, activeChat, user.id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const resp = await axios.get('/api/messages/conversations');
      setConversations(resp.data);
      // Synchronize global unread messages count
      const total = resp.data.reduce((acc: number, c: any) => acc + (c.unread_count || 0), 0);
      setUnreadMessagesCount(total);
    } catch (err) {
    }
  };

  const fetchHistory = async (convId: string) => {
    try {
      const resp = await axios.get(`/api/messages/history/${convId}`);
      setMessages(resp.data.messages);
    } catch (err) {
    }
  };

  const fetchAvailableUsers = async () => {
    setLoadingUsers(true);
    try {
      const resp = await axios.get('/api/messages/search-users');
      setAvailableUsers(resp.data);
    } catch (err) {
    } finally {
      setLoadingUsers(false);
    }
  };

  const openNewChat = () => {
    setIsNewChatOpen(true);
    setIsCreatingGroup(false);
    setGroupName('');
    setSelectedMembers([]);
    fetchAvailableUsers();
  };

  const openNewGroup = () => {
    setIsNewChatOpen(true);
    setIsCreatingGroup(true);
    setGroupName('');
    setSelectedMembers([]);
    fetchAvailableUsers();
  };
   
  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const resp = await axios.get(`/api/messages/search-users?q=${val}`);
      setSearchResults(resp.data);
    } catch (err) {
    }
  };

  const handleGroupSearch = async (val: string) => {
    setGroupSearchQuery(val);
    if (val.length < 2) {
      setGroupSearchResults([]);
      return;
    }
    try {
      const resp = await axios.get(`/api/messages/search-users?q=${val}`);
      setGroupSearchResults(resp.data);
    } catch (err) {
      setGroupSearchResults([]);
    }
  };

  const startDirectChat = (otherUser: any) => {
    const convId = `dm_${otherUser.id}`;
    const existing = conversations.find(c => c.id === convId);
    if (existing) {
      setActiveChat(existing);
    } else {
      setActiveChat({
        id: convId,
        type: 'direct',
        other_user: otherUser
      });
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) {
      toast.error("Please provide a name and select at least one member");
      return;
    }

    try {
      const resp = await axios.post('/api/messages/groups', {
        name: groupName,
        members: selectedMembers
      });
      
      const newGroupConv = {
        id: `group_${resp.data.id}`,
        type: 'group',
        group: resp.data,
        last_message: null,
        unread_count: 0
      };
      
      setConversations(prev => [newGroupConv, ...prev]);
      setActiveChat(newGroupConv);
      setIsNewChatOpen(false);
      toast.success(`Group "${groupName}" created!`);
    } catch (err) {
      toast.error("Failed to create group");
    }
  };

  const fetchGroupMembers = async (gid: string) => {
    try {
      const resp = await axios.get(`/api/messages/groups/${gid}/members`);
      setGroupMembers(resp.data);
      const me = resp.data.find((m: any) => m.id === user.id);
      if (me) setGroupRole(me.role);
    } catch (err) {}
  };

  const addMembersToGroup = async () => {
    if (!activeChat || selectedMembers.length === 0) return;
    const gid = activeChat.id.split('_')[1];
    try {
      await axios.post(`/api/messages/groups/${gid}/members`, {
        members: selectedMembers
      });
      toast.success("Members added to group");
      setIsAddingToGroup(false);
      setSelectedMembers([]);
      fetchGroupMembers(gid);
    } catch (err) {
      toast.error("Failed to add members");
    }
  };

  const removeGroupMember = async (targetUserId: number) => {
    if (!activeChat) return;
    const gid = activeChat.id.split('_')[1];
    try {
      await axios.delete(`/api/messages/groups/${gid}/members/${targetUserId}`);
      toast.success("Member removed");
      fetchGroupMembers(gid);
      if (targetUserId === user.id) {
          setActiveChat(null);
          fetchConversations();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to remove member");
    }
  };

  const changeMemberRole = async (targetUserId: number, role: 'Admin' | 'Member') => {
    if (!activeChat) return;
    const gid = activeChat.id.split('_')[1];
    try {
      await axios.put(`/api/messages/groups/${gid}/members/${targetUserId}/role`, { role });
      toast.success(`Role updated to ${role}`);
      fetchGroupMembers(gid);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update member role");
    }
  };

  const deleteMessage = async (msgId: number) => {
    try {
      await axios.delete(`/api/messages/messages/${msgId}`);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_deleted: true, content: "This message was deleted" } : m));
      toast.success("Message deleted");
      setActiveActionsId(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to delete message");
    }
  };

  const toggleMemberSelection = (uid: number) => {
    setSelectedMembers(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !activeChat) return;
    
    socket?.emit('send_message', {
      sender_id: user.id,
      chat_id: activeChat.id,
      content: newMessage,
      message_type: 'text',
      parent_message_id: replyingTo?.id
    });
    
    setNewMessage('');
    setReplyingTo(null);
    handleTyping(false);
  };

  const handleTyping = (status: boolean) => {
    if (status !== isTyping) {
      setIsTyping(status);
      socket?.emit('typing', {
        chat_id: activeChat?.id,
        user_id: user.id,
        status: status ? 'start' : 'stop'
      });
    }
  };

  const reactToMessage = (msgId: number, emoji: string) => {
    socket?.emit('react_message', {
      message_id: msgId,
      emoji: emoji,
      user_id: user.id,
      chat_id: activeChat?.id
    });
    setReactionMenu(null);
    setActiveActionsId(null);
  };

  const startLongPress = (e: React.PointerEvent, msgId: number) => {
      const x = e.clientX;
      const y = e.clientY;
      longPressTimer.current = setTimeout(() => {
          setReactionMenu({ msgId, x, y });
      }, 500);
  };

  const stopLongPress = () => {
      if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
      }
  };

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const confirmDeleteChat = async () => {
    if (!activeChat) return;
    setIsDeleting(true);

    try {
      await axios.delete(`/api/messages/conversations/${activeChat.id}`);
      setMessages([]);
      fetchConversations();
      setIsDeleteModalOpen(false);
      toast.success(activeChat.type === 'group' ? "Group history cleared" : "Conversation history cleared");
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "Failed to delete conversation";
      toast.error(errorMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteGroup = async () => {
    if (!activeChat || activeChat.type !== 'group') return;
    setIsDeleting(true);
    const gid = activeChat.id.split('_')[1];
    try {
      await axios.delete(`/api/messages/groups/${gid}`);
      toast.success("Group permanently deleted");
      setIsDeleteGroupModalOpen(false);
      setActiveChat(null);
      fetchConversations();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to delete group");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-135px)] bg-card rounded-2xl border-2 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-500">
      
      {/* Conversations Sidebar */}
      <div className={cn(
        "w-full md:w-80 md:min-w-80 md:max-w-80 shrink-0 border-r flex flex-col bg-muted/10 relative",
        activeChat ? "hidden md:flex" : "flex"
      )}>
        <div className="p-4 border-b space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">Messages</h2>
            <div className="flex gap-1">
              <Button
                  size="sm"
                  variant="ghost"
                  className={cn(
                      "h-9 w-9 p-0 rounded-xl",
                      isMuted ? "text-rose-500" : "text-muted-foreground"
                  )}
                  onClick={() => setIsMuted(!isMuted)}
                  title={isMuted ? "Unmute Notifications" : "Mute Notifications"}
              >
                {isMuted ? <HugeiconsIcon icon={VolumeMuteIcon} className="h-4 w-4" /> : <HugeiconsIcon icon={VolumeHighIcon} className="h-4 w-4" />}
              </Button>
              <Button 
                  size="sm" 
                  variant="default" 
                  className="h-9 px-4 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all bg-primary" 
                  onClick={openNewGroup}
              >
                <HugeiconsIcon icon={PlusSignIcon} className="h-4 w-4" /> Group
              </Button>
            </div>
          </div>
          <div className="relative">
            <HugeiconsIcon icon={Search01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search users..." 
              className="pl-9 bg-card border-none ring-1 ring-border focus-visible:ring-primary/50"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1 min-w-0 w-full">
          {searchQuery.length >= 2 ? (
            <div className="p-2 space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase px-3 py-1">Search Results</p>
              {searchResults.map(u => (
                <button 
                  key={u.id}
                  onClick={() => startDirectChat(u)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary/10 transition-colors text-left"
                >
                  <Avatar className="h-10 w-10 border-2 border-background">
                    <AvatarFallback className="bg-primary/5 text-primary font-bold">
                      {u.first_name[0]}{u.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-bold text-sm">{u.first_name} {u.last_name}</div>
                    <div className="text-xs text-muted-foreground">@{u.username}</div>
                  </div>
                </button>
              ))}
              {searchResults.length === 0 && <div className="p-4 text-center text-xs text-muted-foreground">No users found</div>}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {conversations.map(conv => (
                <button 
                  key={conv.id}
                  onClick={() => setActiveChat(conv)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left group",
                    activeChat?.id === conv.id ? "bg-primary text-primary-foreground" : "hover:bg-primary/5"
                  )}
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                      <AvatarFallback className={cn(
                        "font-bold",
                        activeChat?.id === conv.id ? "bg-primary-foreground/20" : "bg-primary/5 text-primary"
                      )}>
                      {conv.type === 'direct' ? conv.other_user?.first_name?.[0] : <HugeiconsIcon icon={UserGroupIcon} className="h-5 w-5" />}
                      </AvatarFallback>
                    </Avatar>
                    {conv.type === 'direct' && (
                      <div className={cn(
                        "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card",
                        conv.other_user?.is_online || (conv.other_user?.last_seen_at && (new Date().getTime() - new Date(conv.other_user.last_seen_at).getTime() < 30000)) ? "bg-primary" : "bg-zinc-400"
                      )} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2 min-w-0">
                      <div className="font-bold text-sm truncate min-w-0">
                        {conv.type === 'direct' ? `${conv.other_user.first_name} ${conv.other_user.last_name}` : conv.group.name}
                      </div>
                      {conv.last_message && (
                        <div className={cn(
                            "text-[10px] whitespace-nowrap opacity-70 shrink-0",
                            activeChat?.id === conv.id ? "text-primary-foreground" : "text-muted-foreground"
                        )}>
                          {format(new Date(conv.last_message.created_at), 'HH:mm')}
                        </div>
                      )}
                    </div>
                    <div className={cn(
                      "text-xs truncate",
                      activeChat?.id === conv.id ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}>
                      {conv.last_message ? (
                        <span className="flex items-center gap-1 min-w-0">
                          {conv.last_message.sender_id === user.id ? (
                            <span className={cn(
                              "font-black shrink-0",
                              activeChat?.id === conv.id ? "text-primary-foreground" : "text-primary/70"
                            )}>You:</span>
                          ) : (
                            conv.type === 'group' && (
                              <span className={cn(
                                "font-black shrink-0",
                                activeChat?.id === conv.id ? "text-primary-foreground" : "text-primary/70"
                              )}>
                                {conv.last_message.sender_name?.split(' ')[0]}:
                              </span>
                            )
                          )}
                          <span className="truncate flex-1 min-w-0">{conv.last_message.content}</span>
                        </span>
                      ) : 'No messages yet'}
                    </div>
                  </div>
                  {conv.unread_count > 0 && activeChat?.id !== conv.id && (
                    <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                      {conv.unread_count}
                    </Badge>
                  )}
                </button>
              ))}
              {conversations.length === 0 && (
                <div className="p-8 text-center space-y-2">
                  <div className="w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center mx-auto">
                    <HugeiconsIcon icon={Search01Icon} className="h-6 w-6 text-primary/40" />
                  </div>
                  <p className="text-xs text-muted-foreground">Search users to start chatting</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
        {/* Floating New Chat Button */}
        <Button
          size="icon"
          onClick={openNewChat}
          className="absolute bottom-4 right-4 h-12 w-12 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all duration-200 bg-primary text-primary-foreground z-20 hover:bg-primary/90 animate-in zoom-in md:hidden"
          title="New Chat"
        >
          <HugeiconsIcon icon={PlusSignIcon} className="h-6 w-6" />
        </Button>
      </div>

      {/* Active Chat Area */}
      <div className={cn(
        "flex-1 min-w-0 flex flex-col bg-background relative",
        !activeChat ? "hidden md:flex" : "flex"
      )}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b flex items-center justify-between px-4 bg-card/50 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setActiveChat(null)}>
                  <HugeiconsIcon icon={ArrowLeft01Icon} className="h-5 w-5" />
                </Button>
                <Avatar className="h-10 w-10 border-2 border-primary/10">
                  <AvatarFallback className="bg-primary/5 text-primary font-bold uppercase text-xs">
                    {activeChat.type === 'direct' ? activeChat.other_user?.first_name?.[0] : activeChat.group?.name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-bold text-sm">
                    <span className="md:hidden">{activeChat.type === 'direct' ? activeChat.other_user.first_name : activeChat.group.name.split(' ')[0]}</span>
                    <span className="hidden md:inline">{activeChat.type === 'direct' ? `${activeChat.other_user.first_name} ${activeChat.other_user.last_name}` : activeChat.group.name}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5">
                    {partnerTyping ? (
                      <span className="text-primary animate-pulse">is typing...</span>
                    ) : (
                      activeChat.type === 'direct' && (
                        <>
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            activeChat.other_user?.is_online || (activeChat.other_user?.last_seen_at && (new Date().getTime() - new Date(activeChat.other_user.last_seen_at).getTime() < 30000)) ? "bg-primary" : "bg-zinc-400"
                          )} />
                          {activeChat.other_user?.is_online || (activeChat.other_user?.last_seen_at && (new Date().getTime() - new Date(activeChat.other_user.last_seen_at).getTime() < 30000)) ? "Active now" : "Offline"}
                        </>
                      )
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary"><HugeiconsIcon icon={CallIcon} className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary"><HugeiconsIcon icon={VideoIcon} className="h-4 w-4" /></Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary"><HugeiconsIcon icon={MoreVertical} className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>View Profile/Settings</DropdownMenuItem>
                    {activeChat.type === 'group' && (
                      <DropdownMenuItem onClick={() => { setIsManagingMembers(true); setIsAddingToGroup(false); }}>
                        Manage Group Members
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem>Search Chat</DropdownMenuItem>
                    <DropdownMenuItem>Mute Notifications</DropdownMenuItem>
                    <DropdownMenuItem className="text-rose-500 font-bold" onClick={() => setIsDeleteModalOpen(true)}>
                      <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4 mr-2" />
                      {activeChat.type === 'group' ? 'Clear Group History' : 'Delete Conversation'}
                    </DropdownMenuItem>

                    {activeChat.type === 'group' && groupRole === 'Admin' && (
                      <DropdownMenuItem className="text-rose-600 font-black" onClick={() => setIsDeleteGroupModalOpen(true)}>
                        <HugeiconsIcon icon={CancelCircleIcon} className="h-4 w-4 mr-2" />
                        Delete Entire Group
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuItem className="text-zinc-500 opacity-50">Block User</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages Thread */}
            <ScrollArea className="flex-1 p-6 min-w-0 w-full overflow-hidden" onClick={() => { setReactionMenu(null); setActiveActionsId(null); }}>
              <div className="space-y-6 overflow-x-hidden">
                {messages.map((msg, idx) => {
                   const isMe = msg.sender_id === user.id;
                   const prevMsg = idx > 0 ? messages[idx-1] : null;
                   const showDate = !prevMsg || format(new Date(msg.created_at), 'yyyy-MM-dd') !== format(new Date(prevMsg.created_at), 'yyyy-MM-dd');
                   
                   // Find parent message for replies
                   const parentMsg = msg.parent_message_id ? messages.find(m => m.id === msg.parent_message_id) : null;

                   return (
                     <div key={msg.id || idx}>
                       {showDate && (
                         <div className="flex justify-center my-6">
                           <span className="bg-muted px-3 py-1 rounded-full text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                             {format(new Date(msg.created_at), 'MMMM do, yyyy')}
                           </span>
                         </div>
                       )}
                        <div className={cn(
                          "flex group items-center gap-2 w-full",
                          isMe ? "justify-end" : "justify-start",
                          msg.is_deleted && "opacity-50"
                        )}>
                            {!isMe ? (
                                <>
                                    <div className="max-w-[75%] space-y-1 relative min-w-0 flex flex-col items-start text-left">
                                {parentMsg && !msg.is_deleted && (
                                  <div className={cn(
                                    "px-3 py-2 rounded-xl mb-[-8px] pb-4 opacity-70 bg-muted/60 border-x-2 border-t-2 w-full max-w-full overflow-hidden",
                                    "border-muted-foreground/20 rounded-tl-none text-left"
                                  )}>
                                   <span className="font-bold block text-[9px] uppercase tracking-tighter mb-1 font-sans text-primary/80">
                                     {parentMsg.sender_id === user.id ? "Your Message" : (parentMsg.sender_name || "Reply")}
                                   </span>
                                   <div className="text-[11px] line-clamp-2 break-words leading-relaxed text-muted-foreground">
                                     {parentMsg.content}
                                   </div>
                                  </div>
                                )}
  
                                <div 
                                  className={cn(
                                    "relative px-4 py-3 rounded-2xl text-sm shadow-sm transition-all duration-200 break-words whitespace-pre-wrap cursor-default min-w-0",
                                    "bg-card border-2 rounded-tl-none hover:border-primary/20",
                                    msg.is_deleted && "italic text-muted-foreground bg-muted/20"
                                  )}
                                  onPointerDown={(e) => !msg.is_deleted && startLongPress(e, msg.id)}
                                  onPointerUp={stopLongPress}
                                  onPointerLeave={stopLongPress}
                                  onClick={(e) => {
                                    if (msg.is_deleted) return;
                                    e.stopPropagation();
                                    setActiveActionsId(activeActionsId === msg.id ? null : msg.id);
                                    setReactionMenu(null);
                                  }}
                                >
                                 {msg.content}
                                 <div className={cn(
                                   "flex items-center gap-1 mt-1 justify-end opacity-60 text-[9px]",
                                   "text-muted-foreground"
                                 )}>
                                   {format(new Date(msg.created_at), 'HH:mm')}
                                 </div>
                               </div>
  
                               {!msg.is_deleted && msg.reactions && msg.reactions.length > 0 && (
                                   <div className="flex flex-wrap gap-1 mt-1 justify-start">
                                       {Array.from(new Set(msg.reactions.map((r: any) => r.emoji))).map((emoji: any) => (
                                           <div 
                                               key={emoji} 
                                               className="bg-card border shadow-sm rounded-full px-1.5 py-0.5 text-[10px] cursor-pointer hover:scale-110 mb-1 transition-transform animate-in zoom-in"
                                               onClick={() => reactToMessage(msg.id, emoji)}
                                           >
                                               {emoji} <span className="font-bold text-muted-foreground ml-0.5">{msg.reactions.filter((r: any) => r.emoji === emoji).length}</span>
                                           </div>
                                       ))}
                                   </div>
                               )}
                            </div>
                            
                            {!msg.is_deleted && (
                              <div className={cn(
                                "transition-opacity flex flex-col gap-1 items-center",
                                activeActionsId === msg.id ? "opacity-100" : "opacity-0 md:group-hover:opacity-100"
                              )}>
                                 <Button 
                                     variant="ghost" 
                                     size="icon" 
                                     className="h-7 w-7 rounded-full bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all duration-200"
                                     onClick={(e) => { 
                                         e.stopPropagation(); 
                                         setReplyingTo(msg); 
                                         messageInputRef.current?.focus();
                                         setActiveActionsId(null);
                                     }}
                                     title="Reply"
                                 >
                                     <HugeiconsIcon icon={Reply} className="h-3.5 w-3.5" />
                                 </Button>
                                 <Button 
                                     variant="ghost" 
                                     size="icon" 
                                     className="h-7 w-7 rounded-full bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all duration-200"
                                     onClick={(e) => {
                                         e.stopPropagation();
                                         setReactionMenu({ 
                                             msgId: msg.id, 
                                             x: e.clientX, 
                                             y: e.clientY 
                                         });
                                     }}
                                     title="React"
                                 >
                                     <HugeiconsIcon icon={SmileIcon} className="h-3.5 w-3.5" />
                                 </Button>
                                 {groupRole === 'Admin' && (
                                     <Button 
                                         variant="ghost" 
                                         size="icon" 
                                         className="h-7 w-7 rounded-full bg-muted/50 hover:bg-rose-100 hover:text-rose-500 transition-all duration-200"
                                         onClick={(e) => { e.stopPropagation(); deleteMessage(msg.id); }}
                                         title="Delete (Admin)"
                                     >
                                         <HugeiconsIcon icon={Delete02Icon} className="h-3.5 w-3.5" />
                                     </Button>
                                 )}
                              </div>
                            )}
                         </>
                      ) : (
                         <>
                            {!msg.is_deleted && (
                              <div className={cn(
                                "transition-opacity flex flex-col gap-1 items-center",
                                activeActionsId === msg.id ? "opacity-100" : "opacity-0 md:group-hover:opacity-100"
                              )}>
                                 <Button 
                                     variant="ghost" 
                                     size="icon" 
                                     className="h-7 w-7 rounded-full bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all duration-200"
                                     onClick={(e) => { 
                                         e.stopPropagation(); 
                                         setReplyingTo(msg); 
                                         messageInputRef.current?.focus();
                                         setActiveActionsId(null);
                                     }}
                                     title="Reply"
                                 >
                                     <HugeiconsIcon icon={Reply} className="h-3.5 w-3.5" />
                                 </Button>
                                 <Button 
                                     variant="ghost" 
                                     size="icon" 
                                     className="h-7 w-7 rounded-full bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all duration-200"
                                     onClick={(e) => {
                                         e.stopPropagation();
                                         setReactionMenu({ 
                                             msgId: msg.id, 
                                             x: e.clientX, 
                                             y: e.clientY 
                                         });
                                     }}
                                     title="React"
                                 >
                                     <HugeiconsIcon icon={SmileIcon} className="h-3.5 w-3.5" />
                                 </Button>
                                 <Button 
                                     variant="ghost" 
                                     size="icon" 
                                     className="h-7 w-7 rounded-full bg-muted/50 hover:bg-rose-100 hover:text-rose-500 transition-all duration-200"
                                     onClick={(e) => { e.stopPropagation(); deleteMessage(msg.id); }}
                                     title="Delete"
                                 >
                                     <HugeiconsIcon icon={Delete02Icon} className="h-3.5 w-3.5" />
                                 </Button>
                              </div>
                            )}

                            <div className="max-w-[75%] space-y-1 relative min-w-0 flex flex-col items-end text-right">
                                {parentMsg && !msg.is_deleted && (
                                  <div className={cn(
                                    "px-3 py-2 rounded-xl mb-[-8px] pb-4 opacity-70 bg-muted/60 border-x-2 border-t-2 w-full max-w-full overflow-hidden",
                                    "border-primary/20 rounded-tr-none text-right"
                                  )}>
                                   <span className="font-bold block text-[9px] uppercase tracking-tighter mb-1 font-sans text-primary-foreground/80">Your Message</span>
                                   <div className="text-[11px] line-clamp-2 break-words leading-relaxed text-muted-foreground">
                                     {parentMsg.content}
                                   </div>
                                  </div>
                                )}
  
                                <div 
                                  className={cn(
                                    "relative px-4 py-3 rounded-2xl text-sm shadow-sm transition-all duration-200 break-words whitespace-pre-wrap cursor-default min-w-0 font-medium",
                                    "bg-primary text-primary-foreground rounded-tr-none hover:shadow-primary/20",
                                    msg.is_deleted && "italic bg-muted/20 text-muted-foreground border-2 border-dashed border-muted-foreground/30"
                                  )}
                                  onPointerDown={(e) => !msg.is_deleted && startLongPress(e, msg.id)}
                                  onPointerUp={stopLongPress}
                                  onPointerLeave={stopLongPress}
                                  onClick={(e) => {
                                    if (msg.is_deleted) return;
                                    e.stopPropagation();
                                    setActiveActionsId(activeActionsId === msg.id ? null : msg.id);
                                    setReactionMenu(null);
                                  }}
                                >
                                 {msg.content}
                                 {!msg.is_deleted && (
                                   <div className="flex items-center gap-1 mt-1 justify-end opacity-60 text-[9px] text-primary-foreground">
                                     {format(new Date(msg.created_at), 'HH:mm')}
                                     {msg.read_at ? <HugeiconsIcon icon={TickDoubleIcon} className="h-3 w-3" /> : <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-3 w-3" />}
                                   </div>
                                 )}
                               </div>
  
                               {!msg.is_deleted && msg.reactions && msg.reactions.length > 0 && (
                                   <div className="flex flex-wrap gap-1 mt-1 justify-end">
                                       {Array.from(new Set(msg.reactions.map((r: any) => r.emoji))).map((emoji: any) => (
                                           <div 
                                               key={emoji} 
                                               className="bg-card border shadow-sm rounded-full px-1.5 py-0.5 text-[10px] cursor-pointer hover:scale-110 mb-1 transition-transform animate-in zoom-in"
                                               onClick={() => reactToMessage(msg.id, emoji)}
                                           >
                                               {emoji} <span className="font-bold text-muted-foreground ml-0.5">{msg.reactions.filter((r: any) => r.emoji === emoji).length}</span>
                                           </div>
                                       ))}
                                   </div>
                               )}
                            </div>
                         </>
                       )}
                        </div>
                      </div>
                   );
                })}
                <div ref={scrollRef} />
              </div>

              {/* Reaction Menu Portal-like component */}
              {reactionMenu && (
                  <div 
                    className="fixed z-[1000] bg-card/95 backdrop-blur-md border-2 shadow-2xl rounded-2xl p-2.5 flex flex-wrap gap-2 animate-in zoom-in-50 slide-in-from-bottom-5 max-w-[280px] sm:max-w-none shadow-primary/10" 
                    style={{ left: Math.min(reactionMenu.x, window.innerWidth - 300), top: reactionMenu.y - 70 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                      {commonEmojis.slice(0, 10).map(e => (
                          <button 
                            key={e} 
                            className="text-2xl hover:scale-125 transition-transform p-1.5 rounded-xl hover:bg-primary/10" 
                            onClick={() => reactToMessage(reactionMenu.msgId, e)}
                          >
                              {e}
                          </button>
                      ))}
                  </div>
              )}
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 bg-card/80 backdrop-blur-md border-t">
              <div className="max-w-4xl mx-auto space-y-2">
                {/* Replying To Preview */}
                {replyingTo && (
                    <div className="flex items-center justify-between bg-muted/40 p-3 rounded-xl border-l-4 border-primary animate-in slide-in-from-bottom-2 duration-300">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-0.5">Replying to {replyingTo.sender_id === user.id ? "Yourself" : replyingTo.sender_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{replyingTo.content}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setReplyingTo(null)}>
                            <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                <div className="flex items-center gap-2">
                  <div className="flex gap-1 relative">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn("h-9 w-9 transition-colors", showEmojiPicker ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEmojiPicker(!showEmojiPicker);
                    }}
                  >
                    <HugeiconsIcon icon={SmileIcon} className="h-5 w-5" />
                  </Button>
                  
                  {showEmojiPicker && (
                    <div 
                      className="absolute bottom-full mb-3 left-0 p-3 bg-card border-2 rounded-2xl shadow-2xl grid grid-cols-7 gap-1.5 z-50 animate-in slide-in-from-bottom-4 duration-300 w-[260px] shadow-primary/10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {commonEmojis.map(e => (
                        <button 
                          key={e} 
                          onClick={(ev) => { ev.stopPropagation(); addEmoji(e); }}
                          className="h-8 w-8 flex items-center justify-center hover:scale-125 hover:bg-primary/10 rounded-lg transition-all text-xl"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => toast('Attachment feature coming soon!', { icon: '📂' })}
                  >
                    <HugeiconsIcon icon={Attachment01Icon} className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex-1 relative group">
                  <Input 
                    ref={messageInputRef}
                    placeholder="Type a message..." 
                    className="pr-12 bg-muted/30 border-none ring-1 ring-border focus-visible:ring-primary/40 h-11 rounded-xl transition-all font-medium py-3"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping(e.target.value.length > 0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') sendMessage();
                    }}
                    onBlur={() => handleTyping(false)}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {newMessage.trim() === '' ? (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-primary/60 hover:text-primary hover:bg-primary/10 rounded-full transition-all"
                        onClick={() => toast('Voice notes coming soon!', { icon: '🎙️' })}
                      >
                        <HugeiconsIcon icon={MicIcon} className="h-5 w-5" />
                      </Button>
                    ) : (
                      <Button 
                        size="icon" 
                        className="h-8 w-8 rounded-full shadow-lg shadow-primary/20 animate-in zoom-in-50 duration-200"
                        onClick={sendMessage}
                      >
                        <HugeiconsIcon icon={SentIcon} className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
            <div className="relative">
              <div className="w-32 h-32 bg-primary/5 rounded-full flex items-center justify-center blur-2xl absolute inset-0 -z-10 animate-pulse" />
              <div className="w-24 h-24 bg-card rounded-3xl border-2 flex items-center justify-center shadow-xl">
                <HugeiconsIcon icon={RobotIcon} className="h-10 w-10 text-primary" />
              </div>
            </div>
            <div className="max-w-xs space-y-2">
              <h3 className="text-xl font-bold tracking-tight">Your Inbox</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Connect with your healthcare team in real-time. Direct messages, groups, and secure clinical updates.
              </p>
            </div>
            <Button 
                variant="outline" 
                className="border-2 rounded-xl font-bold px-8 shadow-sm hover:shadow-md transition-all"
                onClick={openNewChat}
            >
              Start Conversation
            </Button>
          </div>
        )}
      </div>
    </div>

      <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          <DialogHeader className="p-6 bg-primary text-primary-foreground">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-black">{isCreatingGroup ? 'Create Group' : 'New Conversation'}</DialogTitle>
              <Button 
                size="sm" 
                className={cn(
                  "text-[10px] font-black uppercase tracking-widest rounded-full px-4 h-8 transition-all duration-300 shadow-lg",
                  isCreatingGroup 
                    ? "bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/20" 
                    : "bg-white text-primary hover:bg-white/90 hover:scale-105 shadow-black/10"
                )}
                onClick={() => {
                  setIsCreatingGroup(!isCreatingGroup);
                  setSelectedMembers([]);
                }}
              >
                {isCreatingGroup ? 'Cancel Group' : 'New Group Chat'}
              </Button>
            </div>
          </DialogHeader>
          <div className="p-4 space-y-4">
            {isCreatingGroup && (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Group Name</p>
                <Input 
                  placeholder="Enter group name..." 
                  className="h-11 font-bold"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>
            )}
            <div className="relative">
              <HugeiconsIcon icon={Search01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search staff members..." 
                className="pl-9 h-11"
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2">
                {isCreatingGroup ? `Select Members (${selectedMembers.length} selected)` : 'Recent Contacts'}
              </p>
              <ScrollArea className="h-[250px] pr-4">
                {loadingUsers ? (
                  <div className="flex items-center justify-center h-full">
                    <HugeiconsIcon icon={Loading03Icon} className="h-8 w-8 text-primary animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-1 pt-1">
                    {(searchQuery.length >= 2 ? searchResults : availableUsers).map((u: any) => (
                      <button
                        key={u.id}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group",
                          selectedMembers.includes(u.id) ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-primary/5"
                        )}
                        onClick={() => {
                          if (isCreatingGroup) {
                            toggleMemberSelection(u.id);
                          } else {
                            startDirectChat(u);
                            setIsNewChatOpen(false);
                          }
                        }}
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10 border-2 border-background group-hover:border-primary/20">
                            <AvatarFallback className="bg-primary/5 text-primary font-bold">
                              {u.first_name?.[0]}{u.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          {selectedMembers.includes(u.id) && (
                            <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5 animate-in zoom-in">
                              <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold">{u.first_name} {u.last_name}</div>
                          <div className="text-xs text-muted-foreground">@{u.username}</div>
                        </div>
                      </button>
                    ))}
                    {(searchQuery.length >= 2 ? searchResults : availableUsers).length === 0 && (
                       <div className="text-center py-8 text-muted-foreground italic text-sm">No users found</div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
          {isCreatingGroup && (
            <div className="p-4 bg-muted/30 border-t flex gap-2">
               <Button variant="ghost" className="flex-1 font-bold h-11" onClick={() => setIsCreatingGroup(false)}>Back</Button>
               <Button 
                className="flex-[2] font-black h-11 shadow-lg shadow-primary/20" 
                disabled={!groupName.trim() || selectedMembers.length === 0}
                onClick={createGroup}
              >
                Create Group Chat
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ActionConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteChat}
        title="Delete Conversation?"
        description="This will permanently remove all messages and the chat session for everyone involved. This action cannot be undone."
        confirmText="Permanently Delete"
        variant="danger"
        loading={isDeleting}
      />

      <ActionConfirmModal 
        isOpen={isDeleteGroupModalOpen}
        onClose={() => setIsDeleteGroupModalOpen(false)}
        onConfirm={confirmDeleteGroup}
        title="Delete Entire Group?"
        description="This will permanently delete the group, remove all members, and erase all message history for everyone. This action cannot be undone."
        confirmText="Yes, Permanently Delete Group"
        variant="danger"
        loading={isDeleting}
      />

      {/* Group Member Management Dialog */}
      <Dialog open={isManagingMembers} onOpenChange={setIsManagingMembers}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          <DialogHeader className="p-6 bg-zinc-900 dark:bg-background text-white">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-black">Group Settings</DialogTitle>
                <p className="text-zinc-400 text-[10px] font-black uppercase tracking-wider mt-1">{activeChat?.group?.name}</p>
              </div>
              {groupRole === 'Admin' && !isAddingToGroup && (
                <Button 
                    size="sm" 
                    className="bg-primary hover:bg-primary/90 text-[10px] font-black uppercase tracking-widest rounded-full h-8 px-4"
                    onClick={() => { 
                        setIsAddingToGroup(true); 
                        setGroupSearchQuery('');
                        setGroupSearchResults([]);
                        fetchAvailableUsers(); 
                    }}
                >
                  <HugeiconsIcon icon={PlusSignIcon} className="h-3.5 w-3.5 mr-1" /> Add People
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="p-6 space-y-6">
            {!isAddingToGroup ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <span>Participants ({groupMembers.length})</span>
                  <span>Role</span>
                </div>
                <ScrollArea className="h-[300px] -mx-2 px-2">
                  <div className="space-y-2">
                    {groupMembers.map(m => (
                      <div key={m.id} className="flex items-center justify-between group/member p-2 rounded-xl transition-colors hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                            <AvatarFallback className="bg-primary/5 text-primary font-bold">
                              {m.first_name?.[0]}{m.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-bold flex items-center gap-2">
                              {m.first_name} {m.last_name}
                              {m.id === user.id && <Badge variant="secondary" className="text-[8px] h-4 px-1 bg-primary/10 text-primary uppercase font-black">You</Badge>}
                            </div>
                            <div className="text-[10px] text-muted-foreground">@{m.username}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className={cn(
                                "text-[10px] uppercase font-black px-2",
                                m.role === 'Admin' ? "border-amber-500/50 text-amber-600 bg-amber-500/5" : "border-muted-foreground/30 text-muted-foreground"
                            )}>
                                {m.role}
                            </Badge>
                            {groupRole === 'Admin' && m.id !== user.id && (
                              <div className="flex items-center gap-1">
                                {m.role !== 'Admin' && (
                                  <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-muted-foreground hover:text-amber-500 opacity-0 group-hover/member:opacity-100 transition-all rounded-full"
                                      onClick={() => changeMemberRole(m.id, 'Admin')}
                                      title="Make Admin"
                                  >
                                      <HugeiconsIcon icon={ShieldCheck} className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-muted-foreground hover:text-rose-500 opacity-0 group-hover/member:opacity-100 transition-all rounded-full"
                                    onClick={() => removeGroupMember(m.id)}
                                    title="Remove Member"
                                >
                                    <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <Button 
                    variant="outline" 
                    className="w-full h-11 border-2 font-bold text-rose-500 hover:bg-rose-50 rounded-xl"
                    onClick={() => removeGroupMember(user.id)}
                >
                    Leave Group
                </Button>
              </div>
            ) : (
              <div className="space-y-4 animate-in slide-in-from-right-4">
                <div className="relative">
                  <HugeiconsIcon icon={Search01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search people to add..." 
                    className="pl-9 h-11 font-bold"
                    value={groupSearchQuery}
                    onChange={(e) => handleGroupSearch(e.target.value)}
                  />
                </div>
                <ScrollArea className="h-[250px] border-2 rounded-xl p-2 bg-muted/10">
                  {loadingUsers ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-2 py-8">
                      <HugeiconsIcon icon={Loading03Icon} className="h-8 w-8 text-primary animate-spin" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loading People...</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {(groupSearchQuery.length > 0
                        ? availableUsers.filter((u: any) => 
                            u.first_name.toLowerCase().includes(groupSearchQuery.toLowerCase()) || 
                            u.last_name.toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
                            u.username.toLowerCase().includes(groupSearchQuery.toLowerCase())
                          )
                        : availableUsers)
                        .filter(u => !groupMembers.find(m => m.id === u.id))
                        .map((u: any) => (
                        <button
                          key={u.id}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group",
                            selectedMembers.includes(u.id) ? "bg-primary text-white shadow-lg shadow-primary/20" : "hover:bg-primary/5"
                          )}
                          onClick={() => toggleMemberSelection(u.id)}
                        >
                          <Avatar className={cn(
                              "h-9 w-9 border-2",
                              selectedMembers.includes(u.id) ? "border-white/50" : "border-background"
                          )}>
                             <AvatarFallback className={cn(
                                 "font-bold",
                                 selectedMembers.includes(u.id) ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                             )}>
                               {u.first_name[0]}{u.last_name[0]}
                             </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className={cn("text-sm font-bold truncate", selectedMembers.includes(u.id) ? "text-white" : "text-foreground group-hover:text-primary transition-colors")}>
                              {u.first_name} {u.last_name}
                            </div>
                            <div className={cn("text-[10px]", selectedMembers.includes(u.id) ? "text-white/70" : "text-muted-foreground")}>@{u.username}</div>
                          </div>
                          {selectedMembers.includes(u.id) ? <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-4 w-4 text-white" /> : <HugeiconsIcon icon={PlusSignIcon} className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />}
                        </button>
                      ))}
                      {(groupSearchQuery.length > 0 && availableUsers.filter((u: any) => 
                          u.first_name.toLowerCase().includes(groupSearchQuery.toLowerCase()) || 
                          u.last_name.toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
                          u.username.toLowerCase().includes(groupSearchQuery.toLowerCase())
                        ).length === 0) && (
                        <div className="text-center py-8 text-muted-foreground italic text-sm">No members matching your search</div>
                      )}
                      {availableUsers.length === 0 && !loadingUsers && (
                        <div className="text-center py-8 text-muted-foreground italic text-sm">All staff are already in this group</div>
                      )}
                    </div>
                  )}
                </ScrollArea>
                <div className="flex gap-2">
                    <Button variant="ghost" className="flex-1 font-bold h-11" onClick={() => setIsAddingToGroup(false)}>Back</Button>
                    <Button 
                        className="flex-[2] font-black h-11 shadow-lg shadow-primary/20" 
                        disabled={selectedMembers.length === 0}
                        onClick={addMembersToGroup}
                    >
                        Add Selected ({selectedMembers.length})
                    </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* User Profile Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          {activeChat?.type === 'direct' && (
            <div className="flex flex-col">
              {/* Profile Background & Avatar Header */}
              <div className="h-32 bg-gradient-to-br from-primary via-primary/80 to-primary/40 relative">
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                    <AvatarFallback className="bg-muted text-primary text-2xl font-black">
                      {activeChat.other_user.first_name[0]}{activeChat.other_user.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn(
                    "absolute bottom-1 right-1 w-5 h-5 rounded-full border-4 border-background",
                    activeChat.other_user?.is_online || (activeChat.other_user?.last_seen_at && (new Date().getTime() - new Date(activeChat.other_user.last_seen_at).getTime() < 30000)) ? "bg-primary" : "bg-zinc-400"
                  )} />
                </div>
              </div>

              {/* Profile Content */}
              <div className="pt-14 pb-8 px-6 text-center space-y-6">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black tracking-tight">
                    {activeChat.other_user.first_name} {activeChat.other_user.last_name}
                  </h3>
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant="secondary" className="bg-primary/5 text-primary border-none font-bold">
                       @{activeChat.other_user.username}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 text-left">
                  <ProfileInfoItem label="Email Address" value={activeChat.other_user.email} icon={Mail01Icon} isLink />
                  <ProfileInfoItem label="Phone Number" value={activeChat.other_user.phone} icon={CallIcon} isLink />
                  
                  <div className="space-y-2 mt-2 pt-4 border-t">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                       <HugeiconsIcon icon={ShieldCheck} className="h-3 w-3" /> System Roles
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {activeChat.other_user.roles?.map((role: string) => (
                        <Badge key={role} className="rounded-lg bg-indigo-500/10 text-indigo-600 border-none hover:bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button 
                    className="w-full h-11 rounded-xl font-bold gap-2 shadow-lg shadow-primary/20"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    Close Profile
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* User Profile Dialog */}
      <UserProfileDialog 
        userProfile={selectedUserProfile}
        isOpen={isUserProfileOpen}
        onOpenChange={setIsUserProfileOpen}
      />
    </MainLayout>
  );
}

// Add viewProfile helper (should be inside MessagingPage)
