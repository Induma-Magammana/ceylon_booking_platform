import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Grid,
    Card,
    Image,
    Title,
    Text,
    Badge,
    Group,
    Stack,
    Button,
    NumberInput,
    Skeleton,
    Alert,
    Divider,
    ActionIcon,
    Anchor,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { IconMapPin, IconCalendar, IconUsers, IconAlertCircle, IconBrandInstagram, IconBrandFacebook } from '@tabler/icons-react';
import { listingsApi, bookingsApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import type { Listing } from '../types';
import { RatingSummary, ReviewsList } from '../components/ui';

export default function ListingDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isAuthenticated, user, token } = useAuthStore();

    const [listing, setListing] = useState<Listing | null>(null);
    const [loading, setLoading] = useState(true);
    const [bookingDate, setBookingDate] = useState<Date | null>(null);
    const [quantity, setQuantity] = useState<number>(1);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [availability, setAvailability] = useState<{ available: boolean; remainingCapacity: number } | null>(null);

    useEffect(() => {
        const fetchListing = async () => {
            if (!id) return;
            const response = await listingsApi.getById(id);
            if (response.success && response.data) {
                setListing(response.data);
            }
            setLoading(false);
        };
        fetchListing();
    }, [id]);

    const checkAvailability = async () => {
        if (!listing || !bookingDate) return;
        const response = await bookingsApi.checkAvailability({
            listingId: listing.id,
            bookingDate: new Date(bookingDate).toISOString().split('T')[0],
            quantity,
        });
        if (response.success) {
            setAvailability(response.data || null);
        }
    };

    useEffect(() => {
        if (bookingDate && listing) {
            checkAvailability();
        }
    }, [bookingDate, quantity, listing]);

    const handleBooking = async () => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        if (!listing || !bookingDate || !token) return;

        setBookingLoading(true);
        try {
            const response = await bookingsApi.create(
                {
                    listingId: listing.id,
                    bookingDate: new Date(bookingDate).toISOString().split('T')[0],
                    quantity,
                },
                token
            );

            if (response.success) {
                notifications.show({
                    title: 'Booking Confirmed!',
                    message: 'Your booking has been successfully created.',
                    color: 'teal',
                });
                navigate('/my-bookings');
            } else {
                notifications.show({
                    title: 'Booking Failed',
                    message: response.error || 'Something went wrong',
                    color: 'red',
                });
            }
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'An unexpected error occurred while processing your booking',
                color: 'red',
            });
        } finally {
            setBookingLoading(false);
        }
    };

    if (loading) {
        return (
            <Container size="lg" py="xl">
                <Grid>
                    <Grid.Col span={{ base: 12, md: 8 }}>
                        <Skeleton height={400} radius="md" />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 4 }}>
                        <Skeleton height={300} radius="md" />
                    </Grid.Col>
                </Grid>
            </Container>
        );
    }

    if (!listing) {
        return (
            <Container size="lg" py="xl">
                <Alert icon={<IconAlertCircle />} title="Not Found" color="red">
                    This listing could not be found.
                </Alert>
            </Container>
        );
    }

    const isLocal = user?.country === 'LK' || user?.userType === 'host';
    const displayPrice = isLocal ? listing.localPrice : listing.foreignPrice;
    const currency = isLocal ? 'LKR' : 'USD';

    return (
        <Container size="lg" py="xl">
            <Grid>
                {/* Main Content */}
                <Grid.Col span={{ base: 12, md: 8 }}>
                    <Card shadow="sm" radius="md" withBorder>
                        <Card.Section>
                            <Image
                                src={listing.coverImage || 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=400&fit=crop'}
                                height={400}
                                alt={listing.title}
                                fit="cover"
                            />
                        </Card.Section>

                        <Stack mt="md" gap="md">
                            <Group justify="space-between">
                                <Title order={2}>{listing.title}</Title>
                                <Badge size="lg" color={listing.inventoryType === 'slot' ? 'teal' : 'blue'}>
                                    {listing.inventoryType === 'slot' ? 'Experience' : 'Accommodation'}
                                </Badge>
                            </Group>

                            <Group gap="xs" c="dimmed">
                                <IconMapPin size={18} />
                                <Text size="lg">{listing.location}</Text>
                            </Group>

                            <Divider />

                            <Text size="md" c="dimmed">
                                {listing.description || 'Experience the beauty of Sri Lanka with this amazing opportunity. Book now to secure your spot!'}
                            </Text>

                            <Group gap="xl">
                                <Group gap="xs">
                                    <IconUsers size={18} />
                                    <Text>Capacity: {listing.capacity} per slot</Text>
                                </Group>
                            </Group>

                            <Divider />

                            {/* Host Information */}
                            <Stack gap="sm">
                                <Title order={4}>Host Information</Title>
                                {listing.host ? (
                                    <>
                                        <Group gap="xs">
                                            <Text fw={500}>Name:</Text>
                                            <Text>{listing.host.full_name || listing.host.fullName || 'Not available'}</Text>
                                        </Group>
                                        <Group gap="xs">
                                            <Text fw={500}>Contact Number:</Text>
                                            <Text>{listing.host.contact_number || listing.host.contactNumber || 'Not available'}</Text>
                                        </Group>
                                        <Group gap="xs" align="flex-start">
                                            <Text fw={500}>Social Media:</Text>
                                            <Group gap="sm">
                                                {listing.socialMediaInstagram ? (
                                                    <Anchor href={listing.socialMediaInstagram} target="_blank" rel="noopener noreferrer">
                                                        <ActionIcon variant="light" color="pink" size="md">
                                                            <IconBrandInstagram size={18} />
                                                        </ActionIcon>
                                                    </Anchor>
                                                ) : null}
                                                {listing.socialMediaFacebook ? (
                                                    <Anchor href={listing.socialMediaFacebook} target="_blank" rel="noopener noreferrer">
                                                        <ActionIcon variant="light" color="blue" size="md">
                                                            <IconBrandFacebook size={18} />
                                                        </ActionIcon>
                                                    </Anchor>
                                                ) : null}
                                                {!listing.socialMediaInstagram && !listing.socialMediaFacebook && (
                                                    <Text c="dimmed">Not available</Text>
                                                )}
                                            </Group>
                                        </Group>
                                    </>
                                ) : (
                                    <Text c="dimmed">Host information not available</Text>
                                )}
                            </Stack>
                        </Stack>
                    </Card>
                </Grid.Col>

                {/* Booking Card */}
                <Grid.Col span={{ base: 12, md: 4 }}>
                    <Card shadow="md" radius="md" withBorder p="lg" style={{ position: 'sticky', top: 80 }}>
                        <Stack>
                            <Group justify="space-between">
                                <div>
                                    <Text size="xl" fw={700} c="teal">
                                        {currency === 'USD' ? '$' : 'Rs.'}{displayPrice.toLocaleString()}
                                    </Text>
                                    <Text size="sm" c="dimmed">
                                        per person
                                    </Text>
                                </div>
                            </Group>

                            <Divider />

                            <DateInput
                                label="Select Date"
                                placeholder="Pick a date"
                                value={bookingDate}
                                onChange={(val: any) => setBookingDate(val)}
                                minDate={new Date()}
                                leftSection={<IconCalendar size={16} />}
                            />

                            <NumberInput
                                label="Number of Guests"
                                value={quantity}
                                onChange={(val) => setQuantity(Number(val) || 1)}
                                min={1}
                                max={listing.capacity}
                                leftSection={<IconUsers size={16} />}
                            />

                            {availability && (
                                <Alert
                                    color={availability.available ? 'teal' : 'red'}
                                    variant="light"
                                >
                                    {availability.available
                                        ? `${availability.remainingCapacity} spots available`
                                        : 'No availability for selected date'}
                                </Alert>
                            )}

                            <Divider />

                            <Group justify="space-between">
                                <Text>Total</Text>
                                <Text size="xl" fw={700}>
                                    {currency === 'USD' ? '$' : 'Rs.'}{(displayPrice * quantity).toLocaleString()}
                                </Text>
                            </Group>

                            <Button
                                fullWidth
                                size="lg"
                                onClick={handleBooking}
                                loading={bookingLoading}
                                disabled={!bookingDate || (availability ? !availability.available : false)}
                            >
                                {isAuthenticated ? 'Book Now' : 'Login to Book'}
                            </Button>
                        </Stack>
                    </Card>
                </Grid.Col>
            </Grid>

            {/* Reviews Section */}
            <Grid mt={40}>
                <Grid.Col span={{ base: 12, md: 5 }}>
                    <RatingSummary listingId={listing.id} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 7 }}>
                    <Title order={3} mb="lg">
                        Guest Reviews
                    </Title>
                    <ReviewsList listingId={listing.id} limit={5} />
                </Grid.Col>
            </Grid>
        </Container>
    );
}
