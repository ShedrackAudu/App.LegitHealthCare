import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Send, 
  Mic, 
  Smile, 
  Paperclip, 
  MoreVertical, 
  Phone, 
  Video,
  User,
  Users,
  Check,
  CheckCheck,
  ArrowLeft,
  Bot,
  Plus,
  Loader2,
  Trash2,
  AlertTriangle,
  Mail,
  ShieldCheck,
  Reply,
  X
} from 'lucide-react';
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
  const { user, socket, setUnreadMessagesCount } = useAppContext();
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [reactionMenu, setReactionMenu] = useState<{msgId: number, x: number, y: number} | null>(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState<any>(null);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const longPressTimer = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  
  const commonEmojis = ['😊', '😂', '👍', '❤️', '🔥', '🙌', '😮', '😢', '💯', '✨', '🙏', '👏', '🎉', '💡', '🚀', '✅', '❌', '🤔', '👀', '💪'];

  useEffect(() => {
    fetchConversations();
    setUnreadMessagesCount(0); // Reset global unread when opening the page
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
    if (activeChat) {
      fetchHistory(activeChat.id);
      socket?.emit('join_chat', { chat_id: activeChat.id });
      socket?.emit('mark_read', { user_id: user.id, chat_id: activeChat.id });
    }
    setReplyingTo(null);
  }, [activeChat]);

  useEffect(() => {
    if (!socket) return;

    socket.on('new_message', (msg) => {
      if (activeChat && (
        (msg.group_id && `group_${msg.group_id}` === activeChat.id) ||
        (!msg.group_id && (`dm_${msg.sender_id}` === activeChat.id || `dm_${msg.receiver_id}` === activeChat.id))
      )) {
        setMessages(prev => [...prev, msg]);
        socket.emit('mark_read', { user_id: user.id, chat_id: activeChat.id });
      }
      
      // Update sidebar regardless of whether it was the active chat
      fetchConversations();
    });

    socket.on('typing_status', (data) => {
      if (activeChat && data.chat_id === activeChat.id) {
        setPartnerTyping(data.status === 'start');
      }
    });

    socket.on('messages_read', (data) => {
      if (activeChat && data.chat_id === activeChat.id) {
        setMessages(prev => prev.map(m => m.sender_id === user.id ? { ...m, read_at: new Date().toISOString() } : m));
      }
    });

    socket.on('message_reacted', (data) => {
      if (activeChat && data.chat_id === activeChat.id) {
        setMessages(prev => prev.map(m => m.id === data.message_id ? { ...m, reactions: data.reactions } : m));
      }
    });

    socket.on('user_presence', (data) => {
      const isOnline = data.status === 'online';
      
      // Update conversations list
      setConversations(prev => prev.map(c => 
        c.id === `dm_${data.user_id}` 
          ? { ...c, other_user: { ...c.other_user, is_online: isOnline, last_seen_at: isOnline ? new Date().toISOString() : c.other_user.last_seen_at } } 
          : c
      ));

      // Update active chat if it matches this user
      setActiveChat((prev: any) => {
        if (prev && prev.type === 'direct' && prev.other_user.id === data.user_id) {
          return { ...prev, other_user: { ...prev.other_user, is_online: isOnline, last_seen_at: isOnline ? new Date().toISOString() : prev.other_user.last_seen_at } };
        }
        return prev;
      });
    });

    return () => {
      socket.off('new_message');
      socket.off('typing_status');
      socket.off('messages_read');
      socket.off('message_reacted');
      socket.off('user_presence');
    };
  }, [socket, activeChat]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const resp = await axios.get('/api/messages/conversations', {
        headers: { 'X-User-ID': user.id }
      });
      setConversations(resp.data);
    } catch (err) {
    }
  };

  const fetchHistory = async (convId: string) => {
    try {
      const resp = await axios.get(`/api/messages/history/${convId}`, {
        headers: { 'X-User-ID': user.id }
      });
      setMessages(resp.data.messages);
    } catch (err) {
    }
  };

  const fetchAvailableUsers = async () => {
    setLoadingUsers(true);
    try {
      const resp = await axios.get('/api/messages/search-users', {
        headers: { 'X-User-ID': user.id }
      });
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
      const resp = await axios.get(`/api/messages/search-users?q=${val}`, {
        headers: { 'X-User-ID': user.id }
      });
      setSearchResults(resp.data);
    } catch (err) {
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
      }, {
        headers: { 'X-User-ID': user.id }
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
      await axios.delete(`/api/messages/conversations/${activeChat.id}`, {
        headers: { 'X-User-ID': user.id }
      });
      setActiveChat(null);
      setMessages([]);
      fetchConversations();
      setIsDeleteModalOpen(false);
      toast.success("Conversation deleted successfully");
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "Failed to delete conversation";
      toast.error(errorMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-135px)] bg-card rounded-2xl border-2 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-500">
      
      {/* Conversations Sidebar */}
      <div className={cn(
        "w-full md:w-80 md:min-w-80 md:max-w-80 shrink-0 border-r flex flex-col bg-muted/10",
        activeChat ? "hidden md:flex" : "flex"
      )}>
        <div className="p-4 border-b space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">Messages</h2>
            <Button 
                size="sm" 
                variant="default" 
                className="h-9 px-4 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all bg-primary" 
                onClick={openNewGroup}
            >
              <Plus className="h-4 w-4" /> New Group
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search users..." 
              className="pl-9 bg-card border-none ring-1 ring-border focus-visible:ring-primary/50"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
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
                      {conv.type === 'direct' ? conv.other_user?.first_name?.[0] : <Users className="h-5 w-5" />}
                      </AvatarFallback>
                    </Avatar>
                    {conv.type === 'direct' && (
                      <div className={cn(
                        "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card",
                        conv.other_user?.is_online || (conv.other_user?.last_seen_at && (new Date().getTime() - new Date(conv.other_user.last_seen_at).getTime() < 30000)) ? "bg-green-500" : "bg-zinc-400"
                      )} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-1">
                      <div className="font-bold text-sm truncate">
                        {conv.type === 'direct' ? `${conv.other_user.first_name} ${conv.other_user.last_name}` : conv.group.name}
                      </div>
                      {conv.last_message && (
                        <div className={cn(
                            "text-[10px] whitespace-nowrap opacity-70",
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
                  {conv.unread_count > 0 && (
                    <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                      {conv.unread_count}
                    </Badge>
                  )}
                </button>
              ))}
              {conversations.length === 0 && (
                <div className="p-8 text-center space-y-2">
                  <div className="w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center mx-auto">
                    <Search className="h-6 w-6 text-primary/40" />
                  </div>
                  <p className="text-xs text-muted-foreground">Search users to start chatting</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
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
                  <ArrowLeft className="h-5 w-5" />
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
                            activeChat.other_user?.is_online || (activeChat.other_user?.last_seen_at && (new Date().getTime() - new Date(activeChat.other_user.last_seen_at).getTime() < 30000)) ? "bg-green-500" : "bg-zinc-400"
                          )} />
                          {activeChat.other_user?.is_online || (activeChat.other_user?.last_seen_at && (new Date().getTime() - new Date(activeChat.other_user.last_seen_at).getTime() < 30000)) ? "Active now" : "Offline"}
                        </>
                      )
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary"><Phone className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary"><Video className="h-4 w-4" /></Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary"><MoreVertical className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>View Profile</DropdownMenuItem>
                    <DropdownMenuItem>Search Chat</DropdownMenuItem>
                    <DropdownMenuItem>Mute Notifications</DropdownMenuItem>
                    <DropdownMenuItem className="text-rose-500 font-bold" onClick={() => setIsDeleteModalOpen(true)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Chat
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-zinc-500 opacity-50">Block User</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages Thread */}
            <ScrollArea className="flex-1 p-6" onClick={() => setReactionMenu(null)}>
              <div className="space-y-6">
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
                         isMe ? "flex-row-reverse justify-start" : "flex-row justify-start"
                       )}>
                          <div className={cn(
                            "max-w-[75%] space-y-1 relative min-w-0 flex flex-col",
                            isMe ? "items-end text-right" : "items-start text-left"
                          )}>
                             {!isMe && msg.group_id && (
                                <span className="text-[10px] font-black uppercase text-primary ml-1 mb-1 block tracking-wider animate-in fade-in slide-in-from-left-2 duration-300">
                                  <span className="md:hidden">{(msg.sender_name || 'Staff').split(' ')[0]}</span>
                                  <span className="hidden md:inline">{msg.sender_name || 'Staff Member'}</span>
                                </span>
                             )}
                             
                             {/* Parent Message Preview (Reply) */}
                              {parentMsg && (
                                <div className={cn(
                                  "text-[11px] px-3 py-2 rounded-xl mb-[-8px] pb-4 opacity-60 bg-muted/50 border-x-2 border-t-2 truncate w-full",
                                  isMe ? "border-primary/20 rounded-tr-none text-right" : "border-muted-foreground/20 rounded-tl-none text-left"
                                )}>
                                 <span className="font-bold block text-[9px] uppercase tracking-tighter mb-0.5">
                                   {parentMsg.sender_id === user.id ? "Your Message" : (parentMsg.sender_name || "Reply")}
                                 </span>
                                 {parentMsg.content}
                               </div>
                             )}

                             <div 
                               className={cn(
                                 "relative px-4 py-3 rounded-2xl text-sm shadow-sm transition-all duration-200 break-words whitespace-pre-wrap cursor-default min-w-0",
                                 isMe ? "bg-primary text-primary-foreground rounded-tr-none hover:shadow-primary/20" : "bg-card border-2 rounded-tl-none hover:border-primary/20"
                               )}
                               onPointerDown={(e) => startLongPress(e, msg.id)}
                               onPointerUp={stopLongPress}
                               onPointerLeave={stopLongPress}
                               onClick={(e) => e.stopPropagation()}
                             >
                              {msg.content}
                              <div className={cn(
                                "flex items-center gap-1 mt-1 justify-end opacity-60 text-[9px]",
                                isMe ? "text-primary-foreground" : "text-muted-foreground"
                              )}>
                                {format(new Date(msg.created_at), 'HH:mm')}
                                {isMe && (
                                  msg.read_at ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />
                                )}
                              </div>
                            </div>

                            {/* Reactions display */}
                            {msg.reactions && msg.reactions.length > 0 && (
                                <div className={cn(
                                    "flex flex-wrap gap-1 mt-1",
                                    isMe ? "justify-end" : "justify-start"
                                )}>
                                    {/* Group reactions by emoji */}
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

                         {/* Action buttons (Reply & React) */}
                         <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex flex-col gap-1 items-center">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 rounded-full bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all duration-200"
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setReplyingTo(msg); 
                                    messageInputRef.current?.focus();
                                }}
                                title="Reply"
                            >
                                <Reply className="h-3.5 w-3.5" />
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
                                <Smile className="h-3.5 w-3.5" />
                            </Button>
                         </div>
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
                            <X className="h-4 w-4" />
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
                    <Smile className="h-5 w-5" />
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
                    <Paperclip className="h-5 w-5" />
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
                        <Mic className="h-5 w-5" />
                      </Button>
                    ) : (
                      <Button 
                        size="icon" 
                        className="h-8 w-8 rounded-full shadow-lg shadow-primary/20 animate-in zoom-in-50 duration-200"
                        onClick={sendMessage}
                      >
                        <Send className="h-4 w-4" />
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
              <div className="w-24 h-24 bg-card rounded-3xl border-2 flex items-center justify-center shadow-xl transform rotate-12 transition-transform hover:rotate-0 duration-500">
                <Bot className="h-10 w-10 text-primary" />
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
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
                              <Check className="h-3 w-3" />
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
                    activeChat.other_user?.is_online || (activeChat.other_user?.last_seen_at && (new Date().getTime() - new Date(activeChat.other_user.last_seen_at).getTime() < 30000)) ? "bg-green-500" : "bg-zinc-400"
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
                  <ProfileInfoItem label="Email Address" value={activeChat.other_user.email} icon={Mail} isLink />
                  <ProfileInfoItem label="Phone Number" value={activeChat.other_user.phone} icon={Phone} isLink />
                  
                  <div className="space-y-2 mt-2 pt-4 border-t">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                       <ShieldCheck className="h-3 w-3" /> System Roles
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

      </div>
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
