import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { useState } from "react";

interface Message {
  id: string;
  sender: string;
  text: string;
  time: string;
  isMe: boolean;
}

const contacts = [
  { name: "রাহুল আহমেদ", lastMsg: "ডিজাইন ফাইল পাঠিয়েছি", time: "২ মি.", unread: 2 },
  { name: "সুমন হাসান", lastMsg: "API রেডি হয়েছে", time: "১৫ মি.", unread: 0 },
  { name: "নাফিসা আক্তার", lastMsg: "টেস্ট রিপোর্ট দেখুন", time: "১ ঘ.", unread: 1 },
  { name: "তানভীর রহমান", lastMsg: "সার্ভার আপডেট হয়েছে", time: "৩ ঘ.", unread: 0 },
];

const initialMessages: Message[] = [
  { id: "1", sender: "রাহুল আহমেদ", text: "হ্যালো, ডিজাইন ফাইল পাঠিয়েছি। একটু দেখে নেবেন?", time: "১০:৩০", isMe: false },
  { id: "2", sender: "আমি", text: "হ্যাঁ, দেখছি। দারুণ হয়েছে! 👍", time: "১০:৩২", isMe: true },
  { id: "3", sender: "রাহুল আহমেদ", text: "ধন্যবাদ! কিছু পরিবর্তন দরকার হলে জানাবেন।", time: "১০:৩৫", isMe: false },
  { id: "4", sender: "আমি", text: "অবশ্যই। হেডার সেকশনে একটু পরিবর্তন দরকার হবে।", time: "১০:৩৮", isMe: true },
];

const Chat = () => {
  const [messages] = useState<Message[]>(initialMessages);
  const [selectedContact, setSelectedContact] = useState(0);
  const [inputValue, setInputValue] = useState("");

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)]">
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] h-full gap-4">
          {/* Contact List */}
          <Card className="bg-card border-border/50 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border/30">
              <h2 className="text-sm font-semibold text-foreground">মেসেজ</h2>
            </div>
            <div className="flex-1 overflow-auto">
              {contacts.map((contact, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedContact(i)}
                  className={`w-full p-3 flex items-center gap-3 hover:bg-secondary/50 transition-colors text-left ${
                    selectedContact === i ? "bg-secondary/70" : ""
                  }`}
                >
                  <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary text-xs font-medium">{contact.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground truncate">{contact.name}</span>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">{contact.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{contact.lastMsg}</p>
                  </div>
                  {contact.unread > 0 && (
                    <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-[9px] text-primary-foreground font-bold">{contact.unread}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </Card>

          {/* Chat Area */}
          <Card className="bg-card border-border/50 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border/30 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center">
                <span className="text-primary text-xs font-medium">{contacts[selectedContact].name.charAt(0)}</span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-foreground">{contacts[selectedContact].name}</h3>
                <p className="text-[10px] text-success">অনলাইন</p>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] px-3.5 py-2.5 rounded-xl text-sm ${
                    msg.isMe
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-secondary text-secondary-foreground rounded-bl-sm"
                  }`}>
                    <p>{msg.text}</p>
                    <p className={`text-[10px] mt-1 ${msg.isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-border/30 flex items-center gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="মেসেজ লিখুন..."
                className="bg-secondary border-border/50 text-foreground placeholder:text-muted-foreground"
              />
              <Button size="icon" className="flex-shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Chat;
