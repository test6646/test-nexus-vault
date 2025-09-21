import { saveAs } from 'file-saver';

export interface ShareResult {
  success: boolean;
  method?: string;
  error?: any;
}

export const shareFile = async (
  file: File, 
  title: string, 
  text?: string
): Promise<ShareResult> => {
  try {
    // Check if Web Share API is available and supports files
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title,
          text,
          files: [file]
        });
        return { success: true, method: 'file_share' };
      } catch (shareError: any) {
        console.warn('File share failed:', shareError);
        // Don't fall back to text share if user cancelled
        if (shareError.name === 'AbortError') {
          return { success: false, error: 'Share cancelled by user' };
        }
      }
    }
    
    // Try text-only share if file sharing not supported
    if (navigator.share && text) {
      try {
        await navigator.share({
          title,
          text: `${text}\n\n📎 File will be downloaded: ${file.name}`
        });
        // Download the file after sharing text
        setTimeout(() => {
          const url = URL.createObjectURL(file);
          const link = document.createElement('a');
          link.href = url;
          link.download = file.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 500);
        return { success: true, method: 'text_share_with_download' };
      } catch (textShareError: any) {
        console.warn('Text share failed:', textShareError);
        if (textShareError.name === 'AbortError') {
          return { success: false, error: 'Share cancelled by user' };
        }
      }
    }
    
    // Fallback: Direct download
    try {
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return { success: true, method: 'download' };
    } catch (urlError) {
      // Last resort: use file-saver
      saveAs(file, file.name);
      return { success: true, method: 'download' };
    }
  } catch (error) {
    console.error('Error sharing file:', error);
    return { success: false, error };
  }
};

export const shareTextWithFile = async (
  text: string,
  title: string,
  file?: File
): Promise<ShareResult> => {
  try {
    // If we have a file, try to share it with text using the better shareFile function
    if (file) {
      return await shareFile(file, title, text);
    }
    
    // If no file, just share text
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text
        });
        return { success: true, method: 'text_share' };
      } catch (shareError) {
        console.warn('Web Share failed for text:', shareError);
      }
    }
    
    // Mobile share intent removed - using only native Web Share API
    
    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(text);
      return { success: true, method: 'clipboard' };
    } catch (clipboardError) {
      console.warn('Clipboard failed:', clipboardError);
      return { success: false, error: clipboardError };
    }
  } catch (error) {
    console.error('Error in shareTextWithFile:', error);
    return { success: false, error };
  }
};