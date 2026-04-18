import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Mail, Phone, Bot, ShieldCheck, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export const ProfileInfoItem = ({ label, value, icon: Icon, isLink = false }: any) => (
  <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-transparent hover:border-primary/10 transition-colors">
    <div className="p-2 bg-background rounded-lg text-primary shadow-sm mt-0.5">
      <Icon className="h-4 w-4" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
      <p className={cn(
        "text-sm font-bold truncate",
        isLink ? "text-primary underline underline-offset-4 decoration-primary/30" : "text-foreground"
      )}>
        {value || 'Not specified'}
      </p>
    </div>
  </div>
);

export const UserProfileDialog = ({ userProfile, isOpen, onOpenChange }: any) => {
  if (!userProfile) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent hideClose={true} className="max-w-md p-0 overflow-hidden rounded-3xl border-none shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="relative h-32 bg-gradient-to-br from-primary via-primary/80 to-primary/60">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full h-8 w-8"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="px-6 pb-8 -mt-16">
          <div className="flex flex-col items-center text-center">
            <div className="relative group">
              <Avatar className="h-32 w-32 border-8 border-background shadow-xl ring-2 ring-primary/10 group-hover:scale-105 transition-transform duration-300">
                <AvatarImage src={userProfile.avatar} />
                <AvatarFallback className="text-3xl font-black bg-muted text-primary">
                  {userProfile.first_name?.[0]}{userProfile.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-2 right-2 h-6 w-6 rounded-full bg-primary border-4 border-background shadow-sm"></div>
            </div>
            
            <div className="mt-4">
              <h2 className="text-2xl font-black text-foreground tracking-tight">
                {userProfile.first_name} {userProfile.last_name}
              </h2>
              <p className="text-primary font-bold text-sm tracking-wide uppercase">@{userProfile.username}</p>
            </div>

            <div className="flex gap-2 mt-4 flex-wrap justify-center">
              {userProfile.roles?.map((role: string) => (
                <Badge key={role} variant="secondary" className="bg-primary/10 text-primary border-none font-bold px-3 py-1">
                  {role}
                </Badge>
              ))}
              <Badge variant="outline" className="font-bold px-3 py-1 border-primary/20">
                {userProfile.section || 'All Sections'}
              </Badge>
            </div>
          </div>

          <div className="mt-8 space-y-3">
             <div className="grid grid-cols-2 gap-3">
               <ProfileInfoItem label="Email" value={userProfile.email} icon={Mail} isLink />
               <ProfileInfoItem label="Phone" value={userProfile.phone} icon={Phone} />
             </div>
             <ProfileInfoItem label="Department" value={userProfile.department} icon={Bot} />
             <div className="grid grid-cols-2 gap-3">
               <ProfileInfoItem label="Joined" value={format(new Date(userProfile.created_at || new Date()), 'MMM yyyy')} icon={ShieldCheck} />
               <ProfileInfoItem label="Status" value={userProfile.is_verified ? "Verified" : "Unverified"} icon={CheckCheck} />
             </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
