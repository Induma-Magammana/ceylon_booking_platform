import { Card, Text, Group, Stack, Avatar } from '@mantine/core';
import StarRating from './StarRating';
import type { Review } from '../../types';

interface ReviewCardProps {
    review: Review;
}

export default function ReviewCard({ review }: ReviewCardProps) {
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="sm">
                <Group justify="space-between">
                    <Group gap="sm">
                        <Avatar color="teal" radius="xl">
                            {review.user?.full_name ? getInitials(review.user.full_name) : '?'}
                        </Avatar>
                        <div>
                            <Text fw={600} size="sm">
                                {review.user?.full_name || 'Anonymous'}
                            </Text>
                            <Text size="xs" c="dimmed">
                                {formatDate(review.createdAt)}
                            </Text>
                        </div>
                    </Group>
                    <StarRating rating={review.rating} size={18} />
                </Group>

                {review.comment && (
                    <Text size="sm" c="dark">
                        {review.comment}
                    </Text>
                )}

                {review.listing && (
                    <Text size="xs" c="dimmed" fs="italic">
                        Review for: {review.listing.title}
                    </Text>
                )}
            </Stack>
        </Card>
    );
}
