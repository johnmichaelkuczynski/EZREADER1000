# EZ Reader - Document Processing Application

## Overview

EZ Reader is a full-stack web application designed for intelligent document processing and text transformation. The application enables users to upload, process, and transform documents using multiple AI language models including OpenAI, Anthropic, and Perplexity. It features advanced mathematical content handling, audio transcription, AI detection capabilities, and a comprehensive document management system.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **Routing**: Wouter for client-side routing
- **State Management**: React hooks with Tanstack Query for server state
- **Math Rendering**: MathJax 3.0 for LaTeX mathematical expressions
- **Build Tool**: Vite with hot module replacement

### Backend Architecture
- **Runtime**: Node.js 20 with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **File Processing**: Multer for file uploads with 50MB limit
- **Session Management**: Express sessions with PostgreSQL store

### Database Architecture
- **ORM**: Drizzle with PostgreSQL dialect
- **Schema**: Type-safe database operations with Zod validation
- **Tables**: Users, Documents, Content Sources, Saved Instructions
- **Migrations**: Drizzle Kit for schema management

## Key Components

### Document Processing Engine
- **Multi-LLM Support**: OpenAI GPT-4, Anthropic Claude, Perplexity integration
- **Text Chunking**: Intelligent document segmentation for large files
- **Math Protection**: LaTeX formula preservation during AI processing
- **File Support**: PDF, DOCX, TXT, images, and audio files

### AI Services Integration
- **OpenAI**: Text processing, AI detection, audio transcription via Whisper
- **Anthropic**: Advanced text processing with Claude models
- **Perplexity**: Online search integration and text processing
- **DeepSeek**: Cost-effective text processing and homework solving capabilities
- **Azure OpenAI**: Specialized math document processing
- **Mathpix**: Mathematical content extraction from images
- **GPTZero**: AI-generated content detection

### File Processing Pipeline
- **PDF Processing**: Text extraction with math formula preservation
- **Audio Transcription**: Multi-provider support (OpenAI Whisper, Azure, Gladia)
- **Image OCR**: Text extraction from images with math support
- **Export Capabilities**: PDF, DOCX, HTML formats with MathJax rendering

### Content Management
- **Document Storage**: Full document lifecycle management
- **Content Sources**: Reference material integration
- **Saved Instructions**: Reusable processing templates
- **Version Control**: Document revision tracking

## Data Flow

1. **Input Stage**: Users upload documents or enter text directly
2. **Preprocessing**: Files are processed for text extraction and math protection
3. **AI Processing**: Content is sent to selected LLM with custom instructions
4. **Post-processing**: Math formulas are restored and content is formatted
5. **Output**: Processed content is displayed with MathJax rendering
6. **Export**: Users can export in multiple formats or email results

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL serverless database
- **AI Services**: OpenAI, Anthropic, Perplexity API keys required
- **Email**: SendGrid for document sharing
- **File Processing**: Various OCR and transcription services

### Optional Services
- **Azure OpenAI**: Enhanced math processing capabilities
- **Mathpix**: Specialized mathematical content extraction
- **Google APIs**: Vision OCR and custom search integration
- **GPTZero**: AI detection service


### Development Tools
- **Replit**: Primary development environment with auto-deployment
- **Vite**: Development server with HMR
- **ESBuild**: Production bundling
- **PostCSS**: CSS processing with Tailwind

## Deployment Strategy

### Development Environment
- **Platform**: Replit with Node.js 20 and PostgreSQL 16 modules
- **Hot Reload**: Vite development server on port 5000
- **Database**: Auto-provisioned PostgreSQL instance
- **Environment Variables**: Managed through Replit secrets

### Production Deployment
- **Target**: Replit Autoscale deployment
- **Build Process**: Vite frontend build + ESBuild backend bundle
- **Database Migrations**: Automatic via Drizzle push commands
- **Static Assets**: Served from dist/public directory

### Configuration Management
- **Environment**: NODE_ENV-based configuration
- **API Keys**: Secure environment variable storage
- **Database**: Connection string via DATABASE_URL
- **CORS**: Configured for cross-origin requests

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

- June 16, 2025: Initial setup
- June 16, 2025: Added DeepSeek as fourth LLM provider with homework solving capabilities
- June 16, 2025: Implemented 15-second delay between chunk requests to prevent Anthropic rate limiting
- June 16, 2025: Fixed math rendering system with proper LaTeX formula detection and MathJax integration
- June 16, 2025: Added comprehensive voice input functionality across all text fields using OpenAI transcription
- June 16, 2025: Implemented Plotly chart generation system with interactive data visualization capabilities