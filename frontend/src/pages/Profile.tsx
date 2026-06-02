import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Paper,
    Title,
    Text,
    TextInput,
    Button,
    Stack,
    Alert,
    Group,
    Select,
    Avatar,
    Divider,
    PasswordInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconCheck, IconUser, IconMail, IconLock, IconPhone } from '@tabler/icons-react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';

export default function Profile() {
    const { user, setAuth, token } = useAuthStore();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const form = useForm({
        initialValues: {
            fullName: user?.fullName || '',
            email: user?.email || '',
            country: user?.country || '',
            contactNumber: user?.contactNumber || '',
            userType: user?.userType || 'tourist',
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
        validate: {
            fullName: (value) => (value.length >= 2 ? null : 'Name must be at least 2 characters'),
            email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
            contactNumber: (value) => {
                if (!value) return 'Contact number is required';
                if (!/^[+]?[0-9\s()-]+$/.test(value)) return 'Invalid contact number format';
                return null;
            },
            newPassword: (value, values) => {
                if (value && value.length < 6) return 'Password must be at least 6 characters';
                if (value && !values.currentPassword) return 'Current password is required to change password';
                return null;
            },
            confirmPassword: (value, values) => {
                if (values.newPassword && value !== values.newPassword) return 'Passwords do not match';
                return null;
            },
        },
    });

    useEffect(() => {
        if (!user) {
            navigate('/login');
        }
    }, [user, navigate]);

    const handleSubmit = async (values: typeof form.values) => {
        if (!token || !user) return;

        setLoading(true);
        setError(null);

        try {
            const updateData: {
                fullName: string;
                country?: string;
                email?: string;
                currentPassword?: string;
                newPassword?: string;
                contactNumber?: string;
            } = {
                fullName: values.fullName,
                country: values.country,
                contactNumber: values.contactNumber,
            };

            // Include email if changed
            if (values.email && values.email !== user.email) {
                updateData.email = values.email;
            }

            // Include password if provided
            if (values.newPassword && values.currentPassword) {
                updateData.currentPassword = values.currentPassword;
                updateData.newPassword = values.newPassword;
            }

            const response = await authApi.updateProfile(updateData, token);

            if (response.success) {
                // Update local auth store with new data
                setAuth(
                    {
                        ...user,
                        fullName: values.fullName,
                        email: values.email,
                        country: values.country,
                        contactNumber: values.contactNumber,
                    },
                    token
                );

                // Clear password fields
                form.setFieldValue('currentPassword', '');
                form.setFieldValue('newPassword', '');
                form.setFieldValue('confirmPassword', '');

                notifications.show({
                    title: 'Profile Updated',
                    message: 'Your profile has been successfully updated.',
                    color: 'teal',
                    icon: <IconCheck size={16} />,
                });
            } else {
                setError(response.error || 'Failed to update profile');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return null;
    }

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <Container size="sm" py="xl">
            <Paper shadow="md" p="xl" radius="md" withBorder>
                <Stack gap="lg">
                    {/* Header */}
                    <Group>
                        <Avatar size="xl" color="teal" radius="xl">
                            {getInitials(user.fullName)}
                        </Avatar>
                        <div>
                            <Title order={2}>My Profile</Title>
                            <Text size="sm" c="dimmed">
                                Manage your account settings
                            </Text>
                        </div>
                    </Group>

                    <Divider />

                    {/* Error Alert */}
                    {error && (
                        <Alert
                            icon={<IconAlertCircle size={16} />}
                            title="Error"
                            color="red"
                            withCloseButton
                            onClose={() => setError(null)}
                        >
                            {error}
                        </Alert>
                    )}

                    {/* Profile Form */}
                    <form onSubmit={form.onSubmit(handleSubmit)}>
                        <Stack gap="md">
                            <TextInput
                                label="Full Name"
                                placeholder="Enter your full name"
                                required
                                leftSection={<IconUser size={16} />}
                                {...form.getInputProps('fullName')}
                            />

                            <TextInput
                                label="Email Address"
                                placeholder="your@email.com"
                                required
                                leftSection={<IconMail size={16} />}
                                {...form.getInputProps('email')}
                            />

                            <TextInput
                                label="Country"
                                placeholder="Enter your country"
                                {...form.getInputProps('country')}
                            />

                            <TextInput
                                label="Contact Number"
                                placeholder="Enter your contact number"
                                required
                                leftSection={<IconPhone size={16} />}
                                description="Required for bookings"
                                {...form.getInputProps('contactNumber')}
                            />

                            <Select
                                label="Account Type"
                                disabled
                                description="Account type cannot be changed"
                                data={[
                                    { value: 'tourist', label: 'Tourist' },
                                    { value: 'host', label: 'Host' },
                                ]}
                                {...form.getInputProps('userType')}
                            />

                            <Divider label="Change Password (Optional)" labelPosition="center" />

                            <PasswordInput
                                label="Current Password"
                                placeholder="Enter your current password"
                                leftSection={<IconLock size={16} />}
                                {...form.getInputProps('currentPassword')}
                            />

                            <PasswordInput
                                label="New Password"
                                placeholder="Enter new password (min 6 characters)"
                                leftSection={<IconLock size={16} />}
                                {...form.getInputProps('newPassword')}
                            />

                            <PasswordInput
                                label="Confirm New Password"
                                placeholder="Confirm new password"
                                leftSection={<IconLock size={16} />}
                                {...form.getInputProps('confirmPassword')}
                            />

                            <Divider />

                            <Group justify="space-between">
                                <Button variant="subtle" onClick={() => navigate(-1)}>
                                    Cancel
                                </Button>
                                <Button type="submit" loading={loading}>
                                    Save Changes
                                </Button>
                            </Group>
                        </Stack>
                    </form>
                </Stack>
            </Paper>
        </Container>
    );
}
