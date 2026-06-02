import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Title,
    Paper,
    TextInput,
    Textarea,
    NumberInput,
    Select,
    Button,
    Stack,
    Group,
    Alert,
    FileInput,
    Image,
    Text,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconUpload } from '@tabler/icons-react';
import { listingsApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export default function CreateListing() {
    const navigate = useNavigate();
    const { user, token, isAuthenticated } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);

    // Redirect if not authenticated or not a host
    useEffect(() => {
        if (!isAuthenticated || user?.userType !== 'host') {
            navigate('/');
        }
    }, [isAuthenticated, user, navigate]);

    const form = useForm({
        initialValues: {
            title: '',
            description: '',
            inventoryType: 'slot' as 'slot' | 'date',
            location: '',
            localPrice: 1000,
            foreignPrice: 10,
            capacity: 10,
            coverImage: '',
            socialMediaInstagram: '',
            socialMediaFacebook: '',
        },
        validate: {
            title: (value) => (value.length >= 3 ? null : 'Title must be at least 3 characters'),
            location: (value) => (value.length >= 2 ? null : 'Location is required'),
            localPrice: (value) => (value > 0 ? null : 'Price must be positive'),
            foreignPrice: (value) => (value > 0 ? null : 'Price must be positive'),
            capacity: (value) => (value >= 1 ? null : 'Capacity must be at least 1'),
            socialMediaInstagram: (value) => {
                if (value && !/^https?:\/\/(www\.)?instagram\.com\/.+/.test(value)) return 'Please enter a valid Instagram URL';
                return null;
            },
            socialMediaFacebook: (value) => {
                if (value && !/^https?:\/\/(www\.)?facebook\.com\/.+/.test(value)) return 'Please enter a valid Facebook URL';
                return null;
            },
        },
    });

    const handleImageChange = (file: File | null) => {
        setImageFile(file);
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setImagePreview(null);
        }
    };

    const uploadImage = async () => {
        if (!imageFile || !token) return null;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('image', imageFile);

            const response = await fetch(`${API_BASE}/api/upload/listing-image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await response.json();
            
            if (data.success && data.data?.url) {
                return data.data.url;
            } else {
                throw new Error(data.error || 'Failed to upload image');
            }
        } catch (err: any) {
            notifications.show({
                title: 'Upload Failed',
                message: err.message || 'Failed to upload image',
                color: 'red',
            });
            return null;
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (values: typeof form.values) => {
        if (!user || !token) return;

        // Validate image
        if (!imageFile && !values.coverImage) {
            setError('Please select a cover image');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Upload image first if file is selected
            let coverImageUrl = values.coverImage;
            if (imageFile) {
                coverImageUrl = await uploadImage();
                if (!coverImageUrl) {
                    setError('Failed to upload image');
                    setLoading(false);
                    return;
                }
            }

            const response = await listingsApi.create(
                {
                    ...values,
                    coverImage: coverImageUrl,
                    hostId: user.id,
                },
                token
            );

            if (response.success) {
                notifications.show({
                    title: 'Listing Created!',
                    message: 'Your listing is now live.',
                    color: 'teal',
                });
                navigate('/dashboard');
            } else {
                setError(response.error || 'Failed to create listing');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        }

        setLoading(false);
    };

    return (
        <Container size="sm" py="xl">
            <Title order={2} mb="xl">
                Create New Listing
            </Title>

            <Paper withBorder shadow="md" p={30} radius="md">
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack>
                        {error && (
                            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                                {error}
                            </Alert>
                        )}

                        <TextInput
                            label="Title"
                            placeholder="e.g., Whale Watching Tour in Mirissa"
                            required
                            {...form.getInputProps('title')}
                        />

                        <Textarea
                            label="Description"
                            placeholder="Describe your experience or accommodation..."
                            minRows={3}
                            {...form.getInputProps('description')}
                        />

                        <Select
                            label="Type"
                            placeholder="Select listing type"
                            required
                            data={[
                                { value: 'slot', label: 'Experience / Tour (time-based)' },
                                { value: 'date', label: 'Accommodation (date-based)' },
                            ]}
                            {...form.getInputProps('inventoryType')}
                        />

                        <TextInput
                            label="Location"
                            placeholder="e.g., Mirissa, Sri Lanka"
                            required
                            {...form.getInputProps('location')}
                        />

                        <Group grow>
                            <NumberInput
                                label="Local Price (LKR)"
                                placeholder="Price for locals"
                                min={1}
                                required
                                {...form.getInputProps('localPrice')}
                            />
                            <NumberInput
                                label="Foreign Price (USD)"
                                placeholder="Price for tourists"
                                min={1}
                                required
                                {...form.getInputProps('foreignPrice')}
                            />
                        </Group>

                        <NumberInput
                            label="Capacity"
                            placeholder="Max guests per slot/day"
                            min={1}
                            required
                            {...form.getInputProps('capacity')}
                        />

                        <Stack gap="xs">
                            <FileInput
                                label="Cover Image"
                                placeholder="Click to upload an image"
                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                leftSection={<IconUpload size={16} />}
                                onChange={handleImageChange}
                                description="Upload JPEG, PNG, or WebP (max 5MB)"
                            />
                            {imagePreview && (
                                <Image
                                    src={imagePreview}
                                    alt="Preview"
                                    height={200}
                                    fit="cover"
                                    radius="md"
                                />
                            )}
                            <Text size="xs" c="dimmed" ta="center">
                                Or enter an image URL below
                            </Text>
                            <TextInput
                                placeholder="https://example.com/image.jpg"
                                {...form.getInputProps('coverImage')}
                            />
                        </Stack>

                        <TextInput
                            label="Instagram Profile (Optional)"
                            placeholder="https://instagram.com/your_profile"
                            description="Link to your Instagram profile"
                            {...form.getInputProps('socialMediaInstagram')}
                        />

                        <TextInput
                            label="Facebook Page (Optional)"
                            placeholder="https://facebook.com/your_page"
                            description="Link to your Facebook page"
                            {...form.getInputProps('socialMediaFacebook')}
                        />

                        <Group justify="flex-end" mt="md">
                            <Button variant="subtle" onClick={() => navigate('/dashboard')}>
                                Cancel
                            </Button>
                            <Button type="submit" loading={loading || uploading}>
                                Create Listing
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Paper>
        </Container>
    );
}
