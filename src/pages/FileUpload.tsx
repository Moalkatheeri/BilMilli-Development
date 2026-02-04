import { useState, useRef } from 'react';
import { Upload, File, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface UploadedFileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'processing' | 'done' | 'error';
  progress: number;
}

const supportedFormats = [
  { ext: 'DWG', desc: 'AutoCAD Drawing' },
  { ext: 'DXF', desc: 'Drawing Exchange' },
  { ext: 'IFC', desc: 'BIM Model' },
  { ext: 'PDF', desc: 'Architectural Plans' },
  { ext: 'JPG/PNG', desc: 'Site Photos' },
  { ext: 'GLB/GLTF', desc: '3D Models' },
];

export default function FileUpload() {
  const [files, setFiles] = useState<UploadedFileInfo[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList) => {
    const newFiles: UploadedFileInfo[] = Array.from(fileList).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      type: f.name.split('.').pop()?.toUpperCase() || 'UNKNOWN',
      status: 'uploading',
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    // Simulate upload progress
    newFiles.forEach((file) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20 + 5;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === file.id ? { ...f, progress: 100, status: 'processing' } : f,
            ),
          );
          // Simulate processing
          setTimeout(() => {
            setFiles((prev) =>
              prev.map((f) => (f.id === file.id ? { ...f, status: 'done' } : f)),
            );
          }, 1500);
        } else {
          setFiles((prev) =>
            prev.map((f) => (f.id === file.id ? { ...f, progress } : f)),
          );
        }
      }, 300);
    });
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      {/* Upload Zone */}
      <div
        className={`upload-area ${dragOver ? 'drag-over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
          }
        }}
        style={dragOver ? { borderColor: 'var(--color-primary)', background: 'var(--color-primary-bg)' } : {}}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
          }}
        />
        <div className="upload-icon">
          <Upload size={24} />
        </div>
        <div className="upload-title">Upload Construction Files</div>
        <div className="upload-subtitle">
          Drag & drop files here or click to browse
        </div>
        <div className="upload-formats">
          {supportedFormats.map((f) => (
            <span key={f.ext} className="format-chip" title={f.desc}>
              .{f.ext}
            </span>
          ))}
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <h2>Uploaded Files</h2>
            <span className="badge badge-success">{files.filter((f) => f.status === 'done').length} ready</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {files.map((file) => (
              <div
                key={file.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-bg-hover)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <File size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{file.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {formatSize(file.size)} &middot; {file.type}
                  </div>
                  {(file.status === 'uploading' || file.status === 'processing') && (
                    <div className="progress-bar" style={{ marginTop: 6 }}>
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  )}
                </div>
                <div>
                  {file.status === 'done' && (
                    <CheckCircle2 size={18} color="var(--color-success)" />
                  )}
                  {file.status === 'error' && (
                    <AlertCircle size={18} color="var(--color-danger)" />
                  )}
                  {file.status === 'uploading' && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {Math.round(file.progress)}%
                    </span>
                  )}
                  {file.status === 'processing' && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-warning)' }}>
                      Processing...
                    </span>
                  )}
                </div>
                <button className="btn-ghost btn-icon" onClick={() => removeFile(file.id)}>
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processing Pipeline Info */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <h2>3D Processing Pipeline</h2>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {[
              { step: '1', title: 'Upload', desc: 'DWG, DXF, IFC, PDF, or images' },
              { step: '2', title: 'Parse', desc: 'Extract geometry and metadata' },
              { step: '3', title: 'Convert', desc: 'Transform to 3D model (GLB)' },
              { step: '4', title: 'View', desc: 'Interactive 3D visualization' },
            ].map((item) => (
              <div
                key={item.step}
                style={{
                  padding: 16,
                  background: 'var(--color-bg)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'var(--color-primary-bg)',
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 8px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                  }}
                >
                  {item.step}
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
