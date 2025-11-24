# Frontend Package Installation Instructions

## Barcode Scanner Dependency

To enable barcode scanning functionality, you need to install the following package:

```bash
cd frontend
npm install react-webcam
```

This package is required for the SelectForm barcode scanner feature.

If you want to use a more advanced scanner, you can optionally install:
```bash
npm install @zxing/library
```

## After Installation

Restart the frontend server:
```bash
npm start
```

