import { useState, useEffect } from 'react';
import { Card, Text, Group, Stack, Progress, Skeleton } from '@mantine/core';
import StarRating from './StarRating';
import { reviewsApi } from '../../services/api';
import type { ListingRatingSummary } from '../../types';

interface RatingSummaryProps {
    listingId: string;
}

export default function RatingSummary({ listingId }: RatingSummaryProps) {
    const [summary, setSummary] = useState<ListingRatingSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSummary = async () => {
            setLoading(true);
            const response = await reviewsApi.getRatingSummary(listingId);
            if (response.success && response.data) {
                setSummary(response.data);
            }
            setLoading(false);
        };
        fetchSummary();
    }, [listingId]);

    if (loading) {
        return (
            <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Stack gap="md">
                    <Skeleton height={30} width="60%" />
                    <Skeleton height={100} />
                </Stack>
            </Card>
        );
    }

    if (!summary || summary.reviewCount === 0) {
        return (
            <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Text c="dimmed" ta="center">
                    No reviews yet
                </Text>
            </Card>
        );
    }

    const ratingDistribution = [
        { stars: 5, count: summary.fiveStar },
        { stars: 4, count: summary.fourStar },
        { stars: 3, count: summary.threeStar },
        { stars: 2, count: summary.twoStar },
        { stars: 1, count: summary.oneStar },
    ];

    return (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="md">
                <Group justify="space-between" align="flex-start">
                    <div>
                        <Text size="xl" fw={700}>
                            {summary.averageRating.toFixed(1)}
                        </Text>
                        <StarRating rating={summary.averageRating} size={20} />
                        <Text size="sm" c="dimmed" mt={4}>
                            Based on {summary.reviewCount} {summary.reviewCount === 1 ? 'review' : 'reviews'}
                        </Text>
                    </div>
                </Group>

                <Stack gap="xs">
                    {ratingDistribution.map(({ stars, count }) => (
                        <Group key={stars} gap="xs" wrap="nowrap">
                            <Text size="sm" style={{ width: 40 }}>
                                {stars} star
                            </Text>
                            <Progress
                                value={(count / summary.reviewCount) * 100}
                                size="sm"
                                style={{ flex: 1 }}
                                color="yellow"
                            />
                            <Text size="sm" c="dimmed" style={{ width: 40, textAlign: 'right' }}>
                                {count}
                            </Text>
                        </Group>
                    ))}
                </Stack>
            </Stack>
        </Card>
    );
}
