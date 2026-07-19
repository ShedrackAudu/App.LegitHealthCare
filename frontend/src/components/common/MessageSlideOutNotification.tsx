import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { HugeiconsIcon } from '@hugeicons/react';
import { CancelCircleIcon, Message01Icon, UserGroupIcon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { motion, AnimatePresence } from 'framer-motion';

export const MessageSlideOutNotification: React.FC = () => {
  const { messageNotifications, dismissMessageNotification } = useAppContext();
  const navigate = useNavigate();

  const handleOpenChat = (chatId: string, notificationId: string) => {
    localStorage.setItem('open_chat_id', chatId);
    dismissMessageNotification(notificationId);
    navigate('/messages');
  };

  return (
    <div className="fixed bottom-5 right-5 z-[99999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {messageNotifications.map((notification: any) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="pointer-events-auto w-full bg-card/85 backdrop-blur-md border border-border/85 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative group hover:border-primary/30 transition-all duration-300"
          >
            {/* Colored left bar indicator */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
            
            <div className="p-4 pl-5 flex gap-3.5">
              {/* Avatar Indicator */}
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary shrink-0">
                {notification.group_id ? (
                  <HugeiconsIcon icon={UserGroupIcon} className="w-5 h-5" />
                ) : (
                  <HugeiconsIcon icon={Message01Icon} className="w-5 h-5" />
                )}
              </div>

              {/* Message Details */}
              <div className="flex-1 min-w-0 pr-6">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest block mb-0.5">
                  {notification.group_id ? 'New Group Message' : 'New Message'}
                </span>
                <h4 className="text-xs font-black text-foreground truncate">
                  {notification.sender_name}
                </h4>
                <p className="text-[11px] text-muted-foreground font-semibold line-clamp-2 mt-1 leading-relaxed break-all">
                  {notification.content}
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => dismissMessageNotification(notification.id)}
                className="absolute top-3 right-3 text-muted-foreground/60 hover:text-foreground hover:scale-105 transition-all p-1"
                aria-label="Dismiss"
              >
                <HugeiconsIcon icon={CancelCircleIcon} className="w-4 h-4" />
              </button>
            </div>

            {/* View / Action footer */}
            <div className="border-t border-border/50 px-5 py-2.5 bg-muted/20 flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
              <span className="text-muted-foreground/70">Persistent until dismissed</span>
              <button
                onClick={() => handleOpenChat(notification.chat_id, notification.id)}
                className="flex items-center gap-1 text-primary hover:text-primary-hover hover:gap-1.5 transition-all font-black cursor-pointer"
              >
                Open Chat
                <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
