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
    // First try Web Share API with files
    if (navigator.share) {
      try {
        // Always try sharing with files first on mobile devices
        await navigator.share({
          title,
          text,
          files: [file]
        });
        return { success: true, method: 'file_share' };
      } catch (shareError: any) {
        console.warn('File share failed, trying text share:', shareError);
        
        // If file sharing failed, try sharing just the text
        if (text) {
          try {
            await navigator.share({
              title,
              text: `${text}\n\n📎 File: ${file.name} (will be downloaded)`
            });
            // Download the file after sharing text
            setTimeout(() => saveAs(file, file.name), 1000);
            return { success: true, method: 'text_share_with_download' };
          } catch (textShareError) {
            console.warn('Text share also failed:', textShareError);
          }
        }
      }
    }
    
    // Create a data URL for the file and try to open it
    try {
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      
      // Direct download fallback
      
      // Final fallback: Download the file
      link.click();
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