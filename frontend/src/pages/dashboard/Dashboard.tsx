import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Container,
    Title,
    Text,
    SimpleGrid,
    Card,
    Button,
    Group,
    Stack,
    Skeleton,
    ThemeIcon,
    Switch,
    Badge,
} from '@mantine/core';
import { IconPlus, IconHome, IconCalendarEvent, IconCash, IconEye, IconEdit } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { listingsApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import type { Listing } from '../../types';

export default function Dashboard() {
    const navigate = useNavigate();
    const { user, token, isAuthenticated } = useAuthStore();
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated || user?.userType !== 'host') {
            navigate('/');
            return;
        }

        const fetchListings = async () => {
            const response = await listingsApi.getAll();
            if (response.success && response.data) {
                // Filter to only show this host's listings
                const myListings = response.data.filter((l: Listing) => l.hostId === user?.id);
                setListings(myListings);
            }
            setLoading(false);
        };

        fetchListings();
    }, [user, token, isAuthenticated, navigate]);

    const handleAvailabilityToggle = async (listingId: string, currentAvailability: boolean) => {
        if (!token) return;

        try {
            const response = await listingsApi.updateAvailability(listingId, !currentAvailability, token);
            
            if (response.success && response.data) {
                // Update the listing in state
                setListings(prevListings =>
                    prevListings.map(listing =>
                        listing.id === listingId ? response.data! : listing
                    )
                );
                
                notifications.show({
                    title: 'Success',
                    message: `Listing is now ${!currentAvailability ? 'available' : 'unavailable'}`,
                    color: 'green',
                });
            } else {
                notifications.show({
                    title: 'Error',
                    message: response.error || 'Failed to update availability',
                    color: 'red',
                });
            }
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'Failed to update availability',
                color: 'red',
            });
        }
    };

    const stats = [
        {
            title: 'Active Listings',
            value: listings.length,
            icon: IconHome,
            color: 'teal',
        },
        {
            title: 'Total Bookings',
            value: '-',
            icon: IconCalendarEvent,
            color: 'blue',
        },
        {
            title: 'Revenue (LKR)',
            value: '-',
            icon: IconCash,
            color: 'green',
        },
    ];

    if (loading) {
        return (
            <Container size="lg" py="xl">
                <Skeleton height={40} mb="xl" />
                <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} height={100} radius="md" />
                    ))}
                </SimpleGrid>
            </Container>
        );
    }

    return (
        <Container size="lg" py="xl">
            <Group justify="space-between" mb="xl">
                <Title order={2}>Host Dashboard</Title>
                <Group>
                    <Button
                        variant="light"
                        leftSection={<IconEye size={16} />}
                        component={Link}
                        to="/dashboard/bookings"
                    >
                        View All Bookings
                    </Button>
                    <Button leftSection={<IconPlus size={16} />} component={Link} to="/dashboard/create-listing">
                        Create Listing
                    </Button>
                </Group>
            </Group>

            {/* Stats Cards */}
            <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl">
                {stats.map((stat) => (
                    <Card key={stat.title} withBorder p="lg" radius="md">
                        <Group>
                            <ThemeIcon size="xl" radius="md" color={stat.color} variant="light">
                                <stat.icon size={24} />
                            </ThemeIcon>
                            <div>
                                <Text size="sm" c="dimmed" tt="uppercase" fw={700}>
                                    {stat.title}
                                </Text>
                                <Text size="xl" fw={700}>
                                    {stat.value}
                                </Text>
                            </div>
                        </Group>
                    </Card>
                ))}
            </SimpleGrid>

            {/* Listings */}
            <Title order={3} mb="md">
                Your Listings
            </Title>

            {listings.length === 0 ? (
                <Card withBorder p="xl" ta="center">
                    <Stack align="center" gap="md">
                        <IconHome size={48} color="gray" />
                        <Text c="dimmed">You haven't created any listings yet.</Text>
                        <Button component={Link} to="/dashboard/create-listing">
                            Create Your First Listing
                        </Button>
                    </Stack>
                </Card>
            ) : (
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    {listings.map((listing) => (
                        <Card key={listing.id} withBorder p="md">
                            <Stack gap="sm">
                                <Group justify="space-between">
                                    <div>
                                        <Group gap="xs" mb={4}>
                                            <Text fw={500}>{listing.title}</Text>
                                            <Badge color={listing.isAvailable ? 'green' : 'red'} size="sm">
                                                {listing.isAvailable ? 'Available' : 'Unavailable'}
                                            </Badge>
                                        </Group>
                                        <Text size="sm" c="dimmed">
                                            {listing.location}
                                        </Text>
                                        <Text size="xs" c="dimmed" mt={2}>
                                            {listing.inventoryType === 'hotel' ? 'Hotel' : 'Vehicle'} • Capacity: {listing.capacity}
                                        </Text>
                                    </div>
                                </Group>
                                
                                <Group justify="space-between" mt="xs">
                                    <Switch
                                        label="Available for booking"
                                        checked={listing.isAvailable ?? true}
                                        onChange={() => handleAvailabilityToggle(listing.id, listing.isAvailable ?? true)}
                                    />
                                    <Group gap="xs">
                                        <Button
                                            variant="subtle"
                                            size="xs"
                                            leftSection={<IconEdit size={14} />}
                                            onClick={() => navigate(`/dashboard/edit-listing/${listing.id}`)}
                                        >
                                            Edit
                                        </Button>
                                        <Button variant="light" size="xs">
                                            View Bookings
                                        </Button>
                                    </Group>
                                </Group>
                            </Stack>
                        </Card>
                    ))}
                </SimpleGrid>
            )}
        </Container>
    );
}
