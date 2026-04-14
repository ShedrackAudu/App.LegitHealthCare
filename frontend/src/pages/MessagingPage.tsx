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
  AlertTriangle
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
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const commonEmojis = ['😊', '😂', '👍', '❤️', '🔥', '🙌', '😮', '😢', '💯', '✨'];

  useEffect(() => {
    fetchConversations();
    setUnreadMessagesCount(0); // Reset global unread when opening the page
  }, []);

  useEffect(() => {
    if (activeChat) {
      fetchHistory(activeChat.id);
      socket?.emit('join_chat', { chat_id: activeChat.id });
      socket?.emit('mark_read', { user_id: user.id, chat_id: activeChat.id });
    }
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
      } else {
        fetchConversations();
      }
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

    socket.on('user_presence', (data) => {
      if (activeChat && activeChat.type === 'direct' && data.user_id === activeChat.other_user.id) {
        setConversations(prev => prev.map(c => 
          c.id === `dm_${data.user_id}` ? { ...c, other_user: { ...c.other_user, last_seen_at: data.status === 'online' ? new Date().toISOString() : null } } : c
        ));
      }
    });

    return () => {
      socket.off('new_message');
      socket.off('typing_status');
      socket.off('messages_read');
      socket.off('user_presence');
    };
  }, [socket, activeChat]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const resp = await axios.get('http://localhost:5000/api/messages/conversations', {
        headers: { 'X-User-ID': user.id }
      });
      setConversations(resp.data);
    } catch (err) {
    }
  };

  const fetchHistory = async (convId: string) => {
    try {
      const resp = await axios.get(`http://localhost:5000/api/messages/history/${convId}`, {
        headers: { 'X-User-ID': user.id }
      });
      setMessages(resp.data.messages);
    } catch (err) {
    }
  };

  const fetchAvailableUsers = async () => {
    setLoadingUsers(true);
    try {
      const resp = await axios.get('http://localhost:5000/api/messages/search-users', {
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
    fetchAvailableUsers();
  };

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const resp = await axios.get(`http://localhost:5000/api/messages/search-users?q=${val}`, {
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

  const sendMessage = () => {
    if (!newMessage.trim() || !activeChat) return;
    
    socket?.emit('send_message', {
      sender_id: user.id,
      chat_id: activeChat.id,
      content: newMessage,
      message_type: 'text'
    });
    
    setNewMessage('');
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

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const confirmDeleteChat = async () => {
    if (!activeChat) return;
    setIsDeleting(true);

    try {
      await axios.delete(`http://localhost:5000/api/messages/conversations/${activeChat.id}`, {
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
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-primary/10 text-primary" onClick={openNewChat}>
              <Plus className="h-4 w-4" />
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
                        conv.other_user?.last_seen_at && (new Date().getTime() - new Date(conv.other_user.last_seen_at).getTime() < 60000) ? "bg-green-500" : "bg-zinc-400"
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
                      {conv.last_message?.content || 'No messages yet'}
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
                    {activeChat.type === 'direct' ? `${activeChat.other_user.first_name} ${activeChat.other_user.last_name}` : activeChat.group.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5">
                    {partnerTyping ? (
                      <span className="text-primary animate-pulse">is typing...</span>
                    ) : (
                      activeChat.type === 'direct' && (
                        <>
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            activeChat.other_user?.last_seen_at && (new Date().getTime() - new Date(activeChat.other_user.last_seen_at).getTime() < 60000) ? "bg-green-500" : "bg-zinc-400"
                          )} />
                          {activeChat.other_user?.last_seen_at && (new Date().getTime() - new Date(activeChat.other_user.last_seen_at).getTime() < 60000) ? "Active now" : "Offline"}
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
                    <DropdownMenuItem>View Profile</DropdownMenuItem>
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
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-6">
                {messages.map((msg, idx) => {
                   const isMe = msg.sender_id === user.id;
                   const prevMsg = idx > 0 ? messages[idx-1] : null;
                   const showDate = !prevMsg || format(new Date(msg.created_at), 'yyyy-MM-dd') !== format(new Date(prevMsg.created_at), 'yyyy-MM-dd');

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
                         "flex group",
                         isMe ? "justify-end" : "justify-start"
                       )}>
                          <div className={cn(
                            "max-w-[85%] md:max-w-[450px] space-y-1",
                            isMe ? "items-end" : "items-start"
                          )}>
                             <div className={cn(
                               "relative px-4 py-3 rounded-2xl text-sm shadow-sm transition-all duration-200 break-words overflow-hidden",
                               isMe 
                                 ? "bg-primary text-primary-foreground rounded-tr-none hover:shadow-primary/20" 
                                 : "bg-card border-2 rounded-tl-none hover:border-primary/20"
                             )}>
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
                         </div>
                       </div>
                     </div>
                   );
                })}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 bg-card/80 backdrop-blur-md border-t">
              <div className="flex items-center gap-2 max-w-4xl mx-auto">
                <div className="flex gap-1 relative">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn("h-9 w-9 transition-colors", showEmojiPicker ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary")}
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <Smile className="h-5 w-5" />
                  </Button>
                  
                  {showEmojiPicker && (
                    <div className="absolute bottom-full mb-2 left-0 p-2 bg-card border-2 rounded-xl shadow-xl flex gap-1 z-50 animate-in slide-in-from-bottom-2 duration-200">
                      {commonEmojis.map(e => (
                        <button 
                          key={e} 
                          onClick={() => addEmoji(e)}
                          className="hover:scale-125 transition-transform p-1 text-lg"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary transition-colors"><Paperclip className="h-5 w-5" /></Button>
                </div>
                <div className="flex-1 relative group">
                  <Input 
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
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary/60 hover:text-primary hover:bg-primary/10 rounded-full transition-all"><Mic className="h-5 w-5" /></Button>
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
            <DialogTitle className="text-2xl font-black">New Conversation</DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search staff members..." 
                className="pl-9 h-11"
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <ScrollArea className="h-[300px] pr-4">
              {loadingUsers ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              ) : (
                <div className="space-y-1">
                  {(searchQuery.length >= 2 ? searchResults : availableUsers).map((u: any) => (
                    <button
                      key={u.id}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary/5 transition-all text-left group"
                      onClick={() => {
                        startDirectChat(u);
                        setIsNewChatOpen(false);
                      }}
                    >
                      <Avatar className="h-10 w-10 border-2 border-background group-hover:border-primary/20">
                        <AvatarFallback className="bg-primary/5 text-primary font-bold">
                          {u.first_name?.[0]}{u.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
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

      </div>
    </MainLayout>
  );
}
