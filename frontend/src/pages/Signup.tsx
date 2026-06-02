import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Container,
    Paper,
    Title,
    Text,
    TextInput,
    PasswordInput,
    Button,
    Stack,
    Anchor,
    Alert,
    Select,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function Signup() {
    const navigate = useNavigate();
    const { setAuth } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const form = useForm({
        initialValues: {
            email: '',
            password: '',
            fullName: '',
            userType: 'tourist' as 'tourist' | 'host',
        },
        validate: {
            email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
            password: (value) => (value.length >= 6 ? null : 'Password must be at least 6 characters'),
            fullName: (value) => (value.length >= 2 ? null : 'Name must be at least 2 characters'),
            userType: (value) => (value ? null : 'Please select account type'),
        },
    });

    const handleSubmit = async (values: typeof form.values) => {
        setLoading(true);
        setError(null);

        try {
            const response = await authApi.signup(values);

            if (response.success && response.data) {
                setAuth(
                    {
                        id: response.data.user.id,
                        email: response.data.user.email,
                        fullName: values.fullName,
                        userType: values.userType,
                        createdAt: new Date().toISOString(),
                    },
                    response.data.session.access_token
                );
                navigate(values.userType === 'host' ? '/dashboard' : '/');
            } else {
                setError(response.error || 'Signup failed');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container size={420} my={40}>
            <Title ta="center">Create your account</Title>
            <Text c="dimmed" size="sm" ta="center" mt={5}>
                Already have an account?{' '}
                <Anchor component={Link} to="/login" size="sm">
                    Sign in
                </Anchor>
            </Text>

            <Paper withBorder shadow="md" p={30} mt={30} radius="md">
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack>
                        {error && (
                            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                                {error}
                            </Alert>
                        )}

                        <TextInput
                            label="Full Name"
                            placeholder="John Doe"
                            required
                            {...form.getInputProps('fullName')}
                        />

                        <TextInput
                            label="Email"
                            placeholder="you@example.com"
                            required
                            {...form.getInputProps('email')}
                        />

                        <PasswordInput
                            label="Password"
                            placeholder="At least 6 characters"
                            required
                            {...form.getInputProps('password')}
                        />

                        <Select
                            label="I am a..."
                            placeholder="Select account type"
                            required
                            data={[
                                { value: 'tourist', label: 'Tourist - I want to book experiences' },
                                { value: 'host', label: 'Host - I want to list my services' },
                            ]}
                            {...form.getInputProps('userType')}
                        />

                        <Button type="submit" fullWidth mt="xl" loading={loading}>
                            Create account
                        </Button>
                    </Stack>
                </form>
            </Paper>
        </Container>
    );
}
