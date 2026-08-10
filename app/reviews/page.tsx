'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Star, ExternalLink } from 'lucide-react';
import { getUserReviews, Review } from '@/lib/firestore';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/firestore';
import { RequireAuth } from '@/components/RequireAuth';

function ReviewsPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReviews = async () => {
      setLoading(true);
      
      try {
        if (user) {
          const reviews = await getUserReviews(user.uid);
          setUserReviews(reviews);
        }
      } catch (error) {
        console.error('Yorumlar yüklenirken hata:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [user]);

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-2xl">
            <MessageSquare className="h-6 w-6 text-blue-500" />
            <span>Yorumlarım</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                  <div className="h-20 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          ) : userReviews.length > 0 ? (
            <div className="space-y-4">
              {userReviews.map((review) => (
                <Card key={review.id} className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="flex items-center gap-2">
                          {review.movieTitle ? (
                            <>
                              <span>{review.movieTitle}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0"
                                onClick={() => router.push(`/movie/${review.imdbId}`)}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <span>Film ID: {review.imdbId}</span>
                          )}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: review.rating }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 text-yellow-500 fill-current" />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(review.createdAt)}
                        </span>
                      </div>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{review.comment}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Henüz yorum yok</h3>
              <p className="text-muted-foreground mb-4">
                Film ve diziler hakkında yorumlarınızı paylaşın
              </p>
              <Button onClick={() => router.push('/search')}>
                Film ve Dizi Keşfet
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <RequireAuth role="approved">
      <ReviewsPageContent />
    </RequireAuth>
  );
}