import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Title,
    Text,
    Table,
    Group,
    Stack,
    Skeleton,
    Card,
    Select,
} from '@mantine/core';
import { IconCalendar, IconUser, IconMapPin } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { bookingsApi, listingsApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import type { Booking, Listing } from '../../types';

export default function HostBookings() {
    const navigate = useNavigate();
    const { user, token, isAuthenticated } = useAuthStore();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [listings, setListings] = useState<Listing[]>([]);
    const [selectedListing, setSelectedListing] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated || user?.userType !== 'host' || !token) {
            navigate('/');
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            // Fetch host's listings
            const listingsResponse = await listingsApi.getAll();
            if (listingsResponse.success && listingsResponse.data) {
                const myListings = listingsResponse.data.filter((l) => l.hostId === user?.id);
                setListings(myListings);

                // Fetch bookings for all host's listings
                const allBookings: Booking[] = [];
                for (const listing of myListings) {
                    const bookingsResponse = await bookingsApi.getByListing(listing.id, token);
                    if (bookingsResponse.success && bookingsResponse.data) {
                        allBookings.push(...bookingsResponse.data);
                    }
                }
                setBookings(allBookings);
            }
            setLoading(false);
        };

        fetchData();
    }, [user, token, isAuthenticated, navigate]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
            case 'accepted':
                return 'green';
            case 'paid':
                return 'blue';
            case 'completed':
                return 'teal';
            case 'pending':
            case 'not_paid':
                return 'yellow';
            case 'cancelled':
                return 'red';
            default:
                return 'gray';
        }
    };

    const handleStatusChange = async (bookingId: string, newStatus: string) => {
        if (!token) return;

        try {
            const response = await bookingsApi.updateStatus(bookingId, newStatus, token);
            
            if (response.success && response.data) {
                // Update the booking in state
                setBookings(prevBookings =>
                    prevBookings.map(booking =>
                        booking.id === bookingId ? response.data! : booking
                    )
                );
                
                notifications.show({
                    title: 'Status Updated',
                    message: `Booking status changed to ${newStatus.replace('_', ' ')}`,
                    color: 'green',
                });
            } else {
                notifications.show({
                    title: 'Error',
                    message: response.error || 'Failed to update status',
                    color: 'red',
                });
            }
        } catch (err) {
            console.error('Failed to update booking status:', err);
            notifications.show({
                title: 'Error',
                message: 'Failed to update booking status',
                color: 'red',
            });
        }
    };

    const filteredBookings = selectedListing
        ? bookings.filter((b) => b.listingId === selectedListing)
        : bookings;

    if (loading) {
        return (
            <Container size="xl" py="xl">
                <Skeleton height={40} mb="xl" />
                <Skeleton height={400} />
            </Container>
        );
    }

    return (
        <Container size="xl" py="xl">
            <Stack gap="xl">
                <Group justify="space-between">
                    <div>
                        <Title order={2}>My Bookings</Title>
                        <Text c="dimmed" size="sm">
                            View and manage bookings for your listings
                        </Text>
                    </div>
                </Group>

                {/* Filter by listing */}
                <Select
                    placeholder="Filter by listing"
                    clearable
                    data={listings.map((l) => ({ value: l.id, label: l.title }))}
                    value={selectedListing}
                    onChange={setSelectedListing}
                    leftSection={<IconMapPin size={16} />}
                />

                {/* Stats Summary */}
                <Group grow>
                    <Card withBorder p="md">
                        <Text size="sm" c="dimmed">
                            Total Bookings
                        </Text>
                        <Text size="xl" fw={700}>
                            {bookings.length}
                        </Text>
                    </Card>
                    <Card withBorder p="md">
                        <Text size="sm" c="dimmed">
                            Accepted
                        </Text>
                        <Text size="xl" fw={700} c="green">
                            {bookings.filter((b) => b.status === 'accepted').length}
                        </Text>
                    </Card>
                    <Card withBorder p="md">
                        <Text size="sm" c="dimmed">
                            Completed
                        </Text>
                        <Text size="xl" fw={700} c="teal">
                            {bookings.filter((b) => b.status === 'completed').length}
                        </Text>
                    </Card>
                </Group>

                {/* Bookings Table */}
                {filteredBookings.length > 0 ? (
                    <Card withBorder p="md">
                        <Table striped highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Listing</Table.Th>
                                    <Table.Th>Tourist</Table.Th>
                                    <Table.Th>Contact</Table.Th>
                                    <Table.Th>Date</Table.Th>
                                    <Table.Th>Time Slot</Table.Th>
                                    <Table.Th>Guests</Table.Th>
                                    <Table.Th>Total</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {filteredBookings.map((booking) => (
                                    <Table.Tr key={booking.id}>
                                        <Table.Td>
                                            <Text size="sm" fw={500}>
                                                {booking.listing?.title || 'N/A'}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">
                                                {booking.tourist?.full_name || booking.tourist?.fullName || 'N/A'}
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                {booking.tourist?.email || ''}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm" fw={500} c="teal">
                                                {booking.tourist?.contact_number || booking.tourist?.contactNumber || 'Not provided'}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Group gap="xs">
                                                <IconCalendar size={14} />
                                                <Text size="sm">{formatDate(booking.bookingDate)}</Text>
                                            </Group>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">{booking.timeSlot || 'All day'}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Group gap="xs">
                                                <IconUser size={14} />
                                                <Text size="sm">{booking.quantity}</Text>
                                            </Group>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm" fw={600}>
                                                {booking.currency === 'USD' ? '$' : 'LKR '}
                                                {booking.totalPrice.toLocaleString()}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Select
                                                value={booking.status}
                                                onChange={(value) => value && handleStatusChange(booking.id, value)}
                                                data={[
                                                    { value: 'pending', label: 'Pending' },
                                                    { value: 'accepted', label: 'Accepted' },
                                                    { value: 'not_paid', label: 'Not Paid' },
                                                    { value: 'paid', label: 'Paid' },
                                                    { value: 'completed', label: 'Completed' },
                                                    { value: 'cancelled', label: 'Cancelled' },
                                                ]}
                                                size="xs"
                                                styles={{
                                                    input: {
                                                        fontWeight: 500,
                                                        color: getStatusColor(booking.status) === 'green' ? 'var(--mantine-color-green-6)' :
                                                               getStatusColor(booking.status) === 'blue' ? 'var(--mantine-color-blue-6)' :
                                                               getStatusColor(booking.status) === 'teal' ? 'var(--mantine-color-teal-6)' :
                                                               getStatusColor(booking.status) === 'yellow' ? 'var(--mantine-color-yellow-6)' :
                                                               getStatusColor(booking.status) === 'red' ? 'var(--mantine-color-red-6)' : undefined,
                                                    },
                                                }}
                                            />
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Card>
                ) : (
                    <Card withBorder p="xl">
                        <Text ta="center" c="dimmed">
                            No bookings found
                            {selectedListing && ' for this listing'}
                        </Text>
                    </Card>
                )}
            </Stack>
        </Container>
    );
}
