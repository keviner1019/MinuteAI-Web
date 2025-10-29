import { supabase, AUDIO_BUCKET } from './config';

/**
 * Upload an audio file to Supabase Storage
 * @param file The file to upload
 * @param userId The user ID (for organizing files by user)
 * @returns The public URL of the uploaded file
 */
export async function uploadAudioFile(file: File, userId: string): Promise<string> {
  try {
    // Generate unique file path
    const timestamp = Date.now();
    const fileName = `${userId}/${timestamp}_${file.name}`;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(AUDIO_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(AUDIO_BUCKET)
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

/**
 * Delete an audio file from Supabase Storage
 * @param fileUrl The public URL of the file to delete
 * @returns True if deletion was successful
 */
export async function deleteAudioFile(fileUrl: string): Promise<boolean> {
  try {
    // Extract the file path from the URL
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split(`/${AUDIO_BUCKET}/`);
    
    if (pathParts.length < 2) {
      throw new Error('Invalid file URL');
    }

    const filePath = pathParts[1];

    // Delete file from Supabase Storage
    const { error } = await supabase.storage
      .from(AUDIO_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('Supabase delete error:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

/**
 * Get a signed URL for a private file (valid for 1 hour)
 * @param filePath The path to the file in storage
 * @returns A signed URL that expires in 1 hour
 */
export async function getSignedUrl(filePath: string): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from(AUDIO_BUCKET)
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      console.error('Error creating signed URL:', error);
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error getting signed URL:', error);
    throw error;
  }
}

/**
 * List all files for a specific user
 * @param userId The user ID
 * @returns Array of file objects
 */
export async function listUserFiles(userId: string) {
  try {
    const { data, error } = await supabase.storage
      .from(AUDIO_BUCKET)
      .list(userId, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      console.error('Error listing files:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error listing user files:', error);
    throw error;
  }
}

