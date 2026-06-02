import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Container,
    Title,
    Text,
    Table,
    Badge,
    Group,
    Button,
    Card,
    Stack,
    Alert,
    Skeleton,
} from '@mantine/core';
import { IconTicket, IconAlertCircle } from '@tabler/icons-react';
import { bookingsApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import type { Booking } from '../types';

export default function MyBookings() {
    const navigate = useNavigate();
    const { user, token, isAuthenticated } = useAuthStore();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        const fetchBookings = async () => {
            if (!user || !token) return;
            const response = await bookingsApi.getByTourist(user.id, token);
            if (response.success && response.data) {
                setBookings(response.data);
            }
            setLoading(false);
        };

        fetchBookings();
    }, [user, token, isAuthenticated, navigate]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'green';
            case 'pending':
                return 'yellow';
            case 'cancelled':
                return 'red';
            default:
                return 'gray';
        }
    };

    if (loading) {
        return (
            <Container size="lg" py="xl">
                <Skeleton height={40} mb="xl" />
                <Stack gap="md">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} height={80} radius="md" />
                    ))}
                </Stack>
            </Container>
        );
    }

    return (
        <Container size="lg" py="xl">
            <Group justify="space-between" mb="xl">
                <Title order={2}>
                    <IconTicket size={28} style={{ marginRight: 8 }} />
                    My Bookings
                </Title>
            </Group>

            {bookings.length === 0 ? (
                <Card withBorder p="xl" ta="center">
                    <Stack align="center" gap="md">
                        <IconTicket size={48} color="gray" />
                        <Text c="dimmed">You haven't made any bookings yet.</Text>
                        <Button component={Link} to="/">
                            Browse Experiences
                        </Button>
                    </Stack>
                </Card>
            ) : (
                <Table striped highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Experience</Table.Th>
                            <Table.Th>Date</Table.Th>
                            <Table.Th>Guests</Table.Th>
                            <Table.Th>Total</Table.Th>
                            <Table.Th>Status</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {bookings.map((booking) => (
                            <Table.Tr key={booking.id}>
                                <Table.Td>
                                    <Text fw={500}>
                                        {booking.listing?.title || 'Experience'}
                                    </Text>
                                    <Text size="sm" c="dimmed">
                                        {booking.listing?.location}
                                    </Text>
                                </Table.Td>
                                <Table.Td>
                                    {new Date(booking.bookingDate).toLocaleDateString()}
                                    {booking.timeSlot && (
                                        <Text size="sm" c="dimmed">
                                            {booking.timeSlot}
                                        </Text>
                                    )}
                                </Table.Td>
                                <Table.Td>{booking.quantity}</Table.Td>
                                <Table.Td>
                                    {booking.currency === 'USD' ? '$' : 'Rs.'}
                                    {booking.totalPrice.toLocaleString()}
                                </Table.Td>
                                <Table.Td>
                                    <Badge color={getStatusColor(booking.status)}>
                                        {booking.status}
                                    </Badge>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            )}
        </Container>
    );
}
