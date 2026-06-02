import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Container,
    Title,
    Text,
    TextInput,
    SimpleGrid,
    Card,
    Image,
    Badge,
    Group,
    Stack,
    Skeleton,
    Select,
} from '@mantine/core';
import { IconSearch, IconMapPin } from '@tabler/icons-react';
import { listingsApi, reviewsApi } from '../services/api';
import type { Listing, ListingRatingSummary } from '../types';
import { FeaturedReviews, StarRating } from '../components/ui';

export default function Home() {
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<string | null>(null);
    const [ratings, setRatings] = useState<Record<string, ListingRatingSummary>>({});

    useEffect(() => {
        const fetchListings = async () => {
            setLoading(true);
            const response = await listingsApi.getAll({
                location: search || undefined,
                inventoryType: typeFilter || undefined,
            });
            if (response.success && response.data) {
                setListings(response.data);
                
                // Fetch ratings for all listings (non-blocking)
                const ratingsData: Record<string, ListingRatingSummary> = {};
                await Promise.allSettled(
                    response.data.map(async (listing) => {
                        try {
                            const ratingResponse = await reviewsApi.getRatingSummary(listing.id);
                            if (ratingResponse.success && ratingResponse.data) {
                                ratingsData[listing.id] = ratingResponse.data;
                            }
                        } catch (error) {
                            // Silently fail for individual ratings
                            console.warn(`Failed to fetch ratings for listing ${listing.id}`);
                        }
                    })
                );
                setRatings(ratingsData);
            }
            setLoading(false);
        };
        fetchListings();
    }, [search, typeFilter]);

    const getPlaceholderImage = (type: string, index: number) => {
        const images = {
            slot: [
                'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop',
                'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop',
                'https://images.unsplash.com/photo-1596178060810-72660ff86e76?w=400&h=300&fit=crop',
            ],
            date: [
                'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=300&fit=crop',
                'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=400&h=300&fit=crop',
                'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop',
            ],
        };
        const typeImages = images[type as keyof typeof images] || images.slot;
        return typeImages[index % typeImages.length];
    };

    return (
        <Container size="xl" py="xl">
            {/* Hero Section */}
            <Stack align="center" mb={50}>
                <Title
                    order={1}
                    size={48}
                    ta="center"
                    style={{ lineHeight: 1.2 }}
                >
                    Discover the Beauty of{' '}
                    <Text
                        component="span"
                        variant="gradient"
                        gradient={{ from: 'teal', to: 'cyan', deg: 90 }}
                        inherit
                    >
                        Sri Lanka
                    </Text>
                </Title>
                <Text size="xl" c="dimmed" ta="center" maw={600}>
                    Book authentic local experiences, tours, and accommodations.
                    Support local communities while exploring paradise.
                </Text>
            </Stack>

            {/* Search & Filters */}
            <Group mb={30} grow>
                <TextInput
                    placeholder="Search by location..."
                    leftSection={<IconSearch size={16} />}
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                    size="md"
                />
                <Select
                    placeholder="Filter by type"
                    clearable
                    data={[
                        { value: 'slot', label: 'Experiences & Tours' },
                        { value: 'date', label: 'Accommodations' },
                    ]}
                    value={typeFilter}
                    onChange={setTypeFilter}
                    size="md"
                />
            </Group>

            {/* Listings Grid */}
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                {loading
                    ? Array(6)
                        .fill(0)
                        .map((_, i) => (
                            <Card key={i} shadow="sm" padding="lg" radius="md" withBorder>
                                <Card.Section>
                                    <Skeleton height={200} />
                                </Card.Section>
                                <Skeleton height={20} mt="md" />
                                <Skeleton height={15} mt="sm" width="70%" />
                            </Card>
                        ))
                    : listings.map((listing, index) => (
                        <Card
                            key={listing.id}
                            shadow="sm"
                            padding="lg"
                            radius="md"
                            withBorder
                            component={Link}
                            to={`/listings/${listing.id}`}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                            <Card.Section>
                                <Image
                                    src={listing.coverImage || getPlaceholderImage(listing.inventoryType, index)}
                                    height={200}
                                    alt={listing.title}
                                    fit="cover"
                                />
                            </Card.Section>

                            <Group justify="space-between" mt="md" mb="xs">
                                <Text fw={500} lineClamp={1}>
                                    {listing.title}
                                </Text>
                                <Group gap="xs">
                                    {listing.isAvailable === false && (
                                        <Badge color="red" variant="filled">
                                            Unavailable
                                        </Badge>
                                    )}
                                    <Badge color={listing.inventoryType === 'slot' ? 'teal' : 'blue'}>
                                        {listing.inventoryType === 'slot' ? 'Experience' : 'Stay'}
                                    </Badge>
                                </Group>
                            </Group>

                            <Group gap="xs" c="dimmed" mb="sm">
                                <IconMapPin size={14} />
                                <Text size="sm">{listing.location}</Text>
                            </Group>

                            <Group justify="space-between" align="center">
                                <Group gap={4}>
                                    {ratings[listing.id] ? (
                                        <>
                                            <StarRating 
                                                rating={ratings[listing.id].averageRating} 
                                                size={14} 
                                            />
                                            <Text size="xs" c="dimmed">
                                                ({ratings[listing.id].reviewCount})
                                            </Text>
                                        </>
                                    ) : (
                                        <Text size="xs" c="dimmed">
                                            No reviews yet
                                        </Text>
                                    )}
                                </Group>
                                <Group gap={4}>
                                    <Text fw={700} c="teal">
                                        ${listing.foreignPrice}
                                    </Text>
                                    <Text size="sm" c="dimmed">
                                        / LKR {listing.localPrice.toLocaleString()}
                                    </Text>
                                </Group>
                            </Group>
                        </Card>
                    ))}
            </SimpleGrid>

            {!loading && listings.length === 0 && (
                <Text ta="center" c="dimmed" mt={50}>
                    No listings found. Try adjusting your search.
                </Text>
            )}

            {/* Featured Reviews Section */}
            {!loading && listings.length > 0 && (
                <Stack mt={80} mb={40}>
                    <FeaturedReviews limit={6} />
                </Stack>
            )}
        </Container>
    );
}
