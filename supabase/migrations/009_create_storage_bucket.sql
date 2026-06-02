-- Create storage bucket for listing images
insert into storage.buckets (id, name)
values ('listing-images', 'listing-images')
on conflict (id) do nothing;

-- Enable RLS on storage.objects
alter table storage.objects enable row level security;

-- Allow anyone to view images
create policy "Public Access to Listing Images"
on storage.objects for select
using ( bucket_id = 'listing-images' );

-- Allow authenticated hosts to upload images
create policy "Hosts can upload listing images"
on storage.objects for insert
with check (
    bucket_id = 'listing-images' AND
    auth.uid() IS NOT NULL
);

-- Allow hosts to update their own images
create policy "Hosts can update their images"
on storage.objects for update
using (
    bucket_id = 'listing-images' AND
    auth.uid() IS NOT NULL
);

-- Allow hosts to delete their own images
create policy "Hosts can delete their images"
on storage.objects for delete
using (
    bucket_id = 'listing-images' AND
    auth.uid() IS NOT NULL
);
