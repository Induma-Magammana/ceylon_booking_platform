import { Link, useNavigate } from 'react-router-dom';
import { Group, Button, Text, Container, Menu, Avatar } from '@mantine/core';
import { IconUser, IconLogout, IconDashboard, IconTicket } from '@tabler/icons-react';
import { useAuthStore } from '../../store/authStore';

export default function Navbar() {
    const { user, isAuthenticated, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <Container size="xl" h="100%">
            <Group h="100%" justify="space-between">
                <Link to="/" style={{ textDecoration: 'none' }}>
                    <Text
                        size="xl"
                        fw={700}
                        variant="gradient"
                        gradient={{ from: 'teal', to: 'cyan', deg: 90 }}
                    >
                        CeylonBooking
                    </Text>
                </Link>

                <Group>
                    {isAuthenticated && user ? (
                        <Menu shadow="md" width={200}>
                            <Menu.Target>
                                <Button variant="subtle" leftSection={<Avatar size="sm" color="teal">{user.fullName?.[0]}</Avatar>}>
                                    {user.fullName}
                                </Button>
                            </Menu.Target>
                            <Menu.Dropdown>
                                {user.userType === 'host' && (
                                    <Menu.Item
                                        leftSection={<IconDashboard size={14} />}
                                        component={Link}
                                        to="/dashboard"
                                    >
                                        Dashboard
                                    </Menu.Item>
                                )}
                                <Menu.Item
                                    leftSection={<IconTicket size={14} />}
                                    component={Link}
                                    to="/my-bookings"
                                >
                                    My Bookings
                                </Menu.Item>
                                <Menu.Item
                                    leftSection={<IconUser size={14} />}
                                    component={Link}
                                    to="/profile"
                                >
                                    Profile Settings
                                </Menu.Item>
                                <Menu.Divider />
                                <Menu.Item
                                    color="red"
                                    leftSection={<IconLogout size={14} />}
                                    onClick={handleLogout}
                                >
                                    Logout
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    ) : (
                        <>
                            <Button variant="subtle" component={Link} to="/login">
                                Login
                            </Button>
                            <Button component={Link} to="/signup">
                                Sign Up
                            </Button>
                        </>
                    )}
                </Group>
            </Group>
        </Container>
    );
}
