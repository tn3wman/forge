use tokio::io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader};
use tokio::process::{ChildStdin, ChildStdout};

pub struct LspTransport {
    stdin: ChildStdin,
    stdout: BufReader<ChildStdout>,
}

impl LspTransport {
    pub fn new(stdin: ChildStdin, stdout: ChildStdout) -> Self {
        Self {
            stdin,
            stdout: BufReader::new(stdout),
        }
    }

    pub async fn send(&mut self, message: &str) -> Result<(), String> {
        let header = format!("Content-Length: {}\r\n\r\n", message.len());
        self.stdin
            .write_all(header.as_bytes())
            .await
            .map_err(|e| e.to_string())?;
        self.stdin
            .write_all(message.as_bytes())
            .await
            .map_err(|e| e.to_string())?;
        self.stdin.flush().await.map_err(|e| e.to_string())?;
        Ok(())
    }

    pub async fn receive(&mut self) -> Result<String, String> {
        let mut content_length: Option<usize> = None;
        loop {
            let mut line = String::new();
            let bytes_read = self
                .stdout
                .read_line(&mut line)
                .await
                .map_err(|e| e.to_string())?;
            if bytes_read == 0 {
                return Err("EOF while reading headers".to_string());
            }
            let trimmed = line.trim();
            if trimmed.is_empty() {
                break;
            }
            if let Some(len_str) = trimmed.strip_prefix("Content-Length: ") {
                content_length =
                    Some(len_str.parse().map_err(|e: std::num::ParseIntError| e.to_string())?);
            }
            // Ignore other headers (e.g. Content-Type)
        }
        let len = content_length.ok_or("Missing Content-Length header")?;
        let mut buf = vec![0u8; len];
        self.stdout
            .read_exact(&mut buf)
            .await
            .map_err(|e| e.to_string())?;
        String::from_utf8(buf).map_err(|e| e.to_string())
    }
}

#[cfg(test)]
mod tests {
    // Transport tests require real ChildStdin/ChildStdout which can't be easily mocked.
    // Integration tests would verify the framing with a real subprocess.
    // We test the framing format logic inline here.

    #[test]
    fn test_content_length_format() {
        let message = r#"{"jsonrpc":"2.0","id":1,"method":"initialize"}"#;
        let header = format!("Content-Length: {}\r\n\r\n", message.len());
        assert!(header.starts_with("Content-Length: "));
        assert!(header.ends_with("\r\n\r\n"));
        let len_str = header
            .trim()
            .strip_prefix("Content-Length: ")
            .unwrap();
        let len: usize = len_str.parse().unwrap();
        assert_eq!(len, message.len());
    }

    #[test]
    fn test_content_length_with_unicode() {
        // LSP uses byte length, not char count
        let message = r#"{"text":"hello 世界"}"#;
        let byte_len = message.len();
        let char_count = message.chars().count();
        // With multi-byte chars, byte length > char count
        assert!(byte_len > char_count);
        let header = format!("Content-Length: {}\r\n\r\n", byte_len);
        assert!(header.contains(&byte_len.to_string()));
    }
}
