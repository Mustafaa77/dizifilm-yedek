'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function WatchPartyRootPage() {
    const { user, userData } = useAuth();
    const router = useRouter();

    const [roomId, setRoomId] = useState('');
    const [loading, setLoading] = useState(false);

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!roomId.trim()) return;
        router.push(`/watch-party/${roomId.trim()}`);
    };

    return (
        <div className="container max-w-lg mx-auto py-20 px-4">
            <Card className="rounded-3xl border-none shadow-2xl bg-muted/20">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                        NOXEN Watch Party
                    </CardTitle>
                    <CardDescription className="text-base mt-2">
                        Oda kodunu girerek arkadaşlarınızla film veya dizi izlemeye başlayın.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <form onSubmit={handleJoin} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium ml-1 text-muted-foreground">Oda Kodu (URL veya Kod)</label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Örn: XyZ123..."
                                    value={roomId}
                                    onChange={(e) => {
                                        // Auto parse if they paste full URL
                                        let val = e.target.value;
                                        if (val.includes('/watch-party/')) {
                                            val = val.split('/watch-party/')[1] || val;
                                        }
                                        setRoomId(val);
                                    }}
                                    className="rounded-full h-12 px-6"
                                />
                                <Button type="submit" className="rounded-full h-12 px-8" disabled={!roomId.trim()}>
                                    Katıl
                                </Button>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
