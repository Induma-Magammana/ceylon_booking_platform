import { useState, useEffect } from 'react';
import { Stack, Text, Skeleton, Button, Group } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import ReviewCard from './ReviewCard';
import { reviewsApi } from '../../services/api';
import type { Review } from '../../types';

interface ReviewsListProps {
    listingId: string;
    limit?: number;
}

export default function ReviewsList({ listingId, limit = 5 }: ReviewsListProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [currentOffset, setCurrentOffset] = useState(0);

    useEffect(() => {
        const fetchReviews = async () => {
            setLoading(true);
            setCurrentOffset(0); // Reset offset for new listing
            const response = await reviewsApi.getByListing(listingId, limit, 0);
            if (response.success && response.data) {
                setReviews(response.data);
                setHasMore(response.data.length === limit);
            }
            setLoading(false);
        };
        fetchReviews();
    }, [listingId, limit]);

    const loadMore = async () => {
        const newOffset = currentOffset + limit;
        setLoading(true);
        const response = await reviewsApi.getByListing(listingId, limit, newOffset);
        if (response.success && response.data) {
            setReviews((prev) => [...prev, ...response.data!]);
            setHasMore(response.data.length === limit);
            setCurrentOffset(newOffset);
        }
        setLoading(false);
    };

    if (loading && reviews.length === 0) {
        return (
            <Stack gap="md">
                <Skeleton height={150} radius="md" />
                <Skeleton height={150} radius="md" />
                <Skeleton height={150} radius="md" />
            </Stack>
        );
    }

    if (reviews.length === 0) {
        return (
            <Text c="dimmed" ta="center" py="xl">
                No reviews yet. Be the first to leave a review!
            </Text>
        );
    }

    return (
        <Stack gap="md">
            {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
            ))}

            {hasMore && (
                <Group justify="center" mt="md">
                    <Button
                        variant="subtle"
                        rightSection={<IconChevronDown size={16} />}
                        onClick={loadMore}
                        loading={loading}
                    >
                        Load More Reviews
                    </Button>
                </Group>
            )}
        </Stack>
    );
}
