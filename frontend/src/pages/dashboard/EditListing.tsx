import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
    Loader,
    Center,
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

export default function EditListing() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, token, isAuthenticated } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [fetchingListing, setFetchingListing] = useState(true);
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
        } catch (err: unknown) {
            const error = err as Error;
            notifications.show({
                title: 'Upload Failed',
                message: error.message || 'Failed to upload image',
                color: 'red',
            });
            return null;
        } finally {
            setUploading(false);
        }
    };

    // Fetch listing data on mount
    useEffect(() => {
        const fetchListing = async () => {
            if (!id) {
                navigate('/dashboard');
                return;
            }

            setFetchingListing(true);
            const response = await listingsApi.getById(id);
            
            if (response.success && response.data) {
                const listing = response.data;
                
                // Verify the current user is the host of this listing
                if (listing.hostId !== user?.id) {
                    notifications.show({
                        title: 'Unauthorized',
                        message: 'You can only edit your own listings.',
                        color: 'red',
                    });
                    navigate('/dashboard');
                    return;
                }

                // Populate form with listing data
                form.setValues({
                    title: listing.title,
                    description: listing.description || '',
                    inventoryType: listing.inventoryType,
                    location: listing.location,
                    localPrice: listing.localPrice,
                    foreignPrice: listing.foreignPrice,
                    capacity: listing.capacity,
                    coverImage: listing.coverImage || '',
                    socialMediaInstagram: listing.socialMediaInstagram || '',
                    socialMediaFacebook: listing.socialMediaFacebook || '',
                });
                
                // Set existing image as preview
                if (listing.coverImage) {
                    setImagePreview(listing.coverImage);
                }
            } else {
                setError(response.error || 'Failed to load listing');
            }
            
            setFetchingListing(false);
        };

        fetchListing();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleSubmit = async (values: typeof form.values) => {
        if (!user || !token || !id) return;

        setLoading(true);
        setError(null);

        try {
            // Upload new image if file is selected
            let coverImageUrl = values.coverImage;
            if (imageFile) {
                coverImageUrl = await uploadImage();
                if (!coverImageUrl) {
                    setError('Failed to upload image');
                    setLoading(false);
                    return;
                }
            }

            const response = await listingsApi.update(
                id,
                {
                    ...values,
                    coverImage: coverImageUrl,
                    hostId: user.id,
                },
                token
            );

            if (response.success) {
                notifications.show({
                    title: 'Listing Updated!',
                    message: 'Your changes have been saved.',
                    color: 'teal',
                });
                navigate('/dashboard');
            } else {
                setError(response.error || 'Failed to update listing');
            }
        } catch (err: unknown) {
            const error = err as Error;
            setError(error.message || 'An error occurred');
        }

        setLoading(false);
    };

    if (fetchingListing) {
        return (
            <Container size="sm" py="xl">
                <Center>
                    <Loader />
                </Center>
            </Container>
        );
    }

    return (
        <Container size="sm" py="xl">
            <Title order={2} mb="xl">
                Edit Listing
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
                                placeholder="Click to upload a new image"
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
                                Save Changes
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Paper>
        </Container>
    );
}
