import { useState, useEffect } from 'react';
import { SimpleGrid, Stack, Title, Text, Skeleton } from '@mantine/core';
import ReviewCard from './ReviewCard';
import { reviewsApi } from '../../services/api';
import type { Review } from '../../types';

interface FeaturedReviewsProps {
    limit?: number;
}

export default function FeaturedReviews({ limit = 6 }: FeaturedReviewsProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReviews = async () => {
            setLoading(true);
            const response = await reviewsApi.getAll({ limit });
            if (response.success && response.data) {
                // Filter only 4-5 star reviews for featured section
                const topReviews = response.data.filter((r) => r.rating >= 4);
                setReviews(topReviews.slice(0, limit));
            }
            setLoading(false);
        };
        fetchReviews();
    }, [limit]);

    if (loading) {
        return (
            <Stack gap="xl">
                <Stack align="center">
                    <Skeleton height={40} width={300} />
                    <Skeleton height={20} width={500} />
                </Stack>
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                    {[...Array(limit)].map((_, i) => (
                        <Skeleton key={i} height={180} radius="md" />
                    ))}
                </SimpleGrid>
            </Stack>
        );
    }

    if (reviews.length === 0) {
        return null; // Don't show section if no reviews
    }

    return (
        <Stack gap="xl">
            <Stack align="center" gap="xs">
                <Title
                    order={2}
                    size={36}
                    ta="center"
                    style={{ lineHeight: 1.2 }}
                >
                    What Our{' '}
                    <Text
                        component="span"
                        variant="gradient"
                        gradient={{ from: 'teal', to: 'cyan', deg: 90 }}
                        inherit
                    >
                        Guests Say
                    </Text>
                </Title>
                <Text size="lg" c="dimmed" ta="center" maw={600}>
                    Real experiences from travelers who have explored Sri Lanka with us
                </Text>
            </Stack>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                {reviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                ))}
            </SimpleGrid>
        </Stack>
    );
}
