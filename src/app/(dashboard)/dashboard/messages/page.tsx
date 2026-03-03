'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useConversations, useMessageThread, useSendMessage, useUser, getRelativeTime } from '@/hooks/api';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, MessageSquare, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const withUserId = searchParams.get('with');
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(withUserId);
  const [message, setMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversationsData, isLoading: conversationsLoading } = useConversations();
  const { data: threadData, isLoading: threadLoading } = useMessageThread(selectedUserId || '');
  const { data: newUserData } = useUser(withUserId || '');
  const sendMessage = useSendMessage();

  const conversations = conversationsData?.conversations || [];
  const messages = threadData?.messages || [];

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedUserId) return;

    try {
      await sendMessage.mutateAsync({
        receiverId: selectedUserId,
        content: message.trim(),
      });
      setMessage('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengirim pesan');
    }
  };

  const selectedConversation = conversations.find(c => c.userId === selectedUserId);
  const newConversationUser = withUserId && !selectedConversation ? newUserData?.user : null;

  return (
    <div className="h-[calc(100vh-12rem)]">
      <div className="grid h-full lg:grid-cols-3 gap-4">
        {/* Conversations List */}
        <Card className={`glass-card ${selectedUserId ? 'hidden lg:block' : ''}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Percakapan</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-18rem)]">
              {conversationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#fd904c]" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Belum ada percakapan</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {conversations.map((conv) => (
                    <button
                      key={conv.userId}
                      onClick={() => setSelectedUserId(conv.userId)}
                      className={`w-full p-4 flex items-start gap-3 hover:bg-muted/50 transition-colors ${
                        selectedUserId === conv.userId ? 'bg-muted/50' : ''
                      }`}
                    >
                      <Avatar>
                        <AvatarFallback className="bg-gradient-to-br from-[#fd904c] to-[#e57835] text-white">
                          {conv.user?.name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium truncate">{conv.user?.name}</p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {getRelativeTime(conv.lastMessage.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-muted-foreground truncate">
                            {conv.lastMessage.content}
                          </p>
                          {conv.unreadCount > 0 && (
                            <Badge className="bg-[#fd904c] text-white text-xs">
                              {conv.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Message Thread */}
        <Card className={`glass-card lg:col-span-2 ${!selectedUserId ? 'hidden lg:flex lg:items-center lg:justify-center' : ''}`}>
          {selectedUserId ? (
            <>
              {/* Header */}
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setSelectedUserId(null)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <Avatar>
                    <AvatarFallback className="bg-gradient-to-br from-[#fd904c] to-[#e57835] text-white">
                      {(selectedConversation?.user || newConversationUser)?.name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {selectedConversation?.user?.name || newConversationUser?.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation?.user?.email || newConversationUser?.email}
                    </p>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 p-0 flex flex-col">
                <ScrollArea ref={scrollRef} className="flex-1 p-4">
                  {threadLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-[#fd904c]" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        Mulai percakapan dengan{' '}
                        {selectedConversation?.user?.name || newConversationUser?.name}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => {
                        const isMine = msg.senderId === user?.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-xl px-4 py-2 ${
                                isMine
                                  ? 'bg-gradient-to-r from-[#fd904c] to-[#e57835] text-white'
                                  : 'bg-muted'
                              }`}
                            >
                              <p className="text-sm">{msg.content}</p>
                              <p
                                className={`text-xs mt-1 ${
                                  isMine ? 'text-white/70' : 'text-muted-foreground'
                                }`}
                              >
                                {getRelativeTime(msg.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>

                {/* Input */}
                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ketik pesan..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!message.trim() || sendMessage.isPending}
                      className="bg-gradient-to-r from-[#fd904c] to-[#e57835]"
                    >
                      {sendMessage.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Pilih percakapan untuk mulai mengobrol</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
