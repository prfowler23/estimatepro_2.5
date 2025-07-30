# AI Assistant Production Deployment Guide

This guide covers the deployment process for the EstimatePro AI Assistant feature.

## Pre-Deployment Checklist

### 1. Environment Configuration

- [ ] Copy `.env.production.example` to `.env.production.local`
- [ ] Set all required environment variables
- [ ] Verify OpenAI API key has sufficient quota
- [ ] Configure rate limits appropriately for your usage

### 2. Database Preparation

- [ ] Run all database migrations
- [ ] Verify RLS policies are in place
- [ ] Create database indexes for performance
- [ ] Set up database backups

### 3. Code Validation

```bash
# Run the deployment validator
npm run deploy:validate

# Or manually run checks
npm run typecheck
npm run lint
npm run test
npm run build
```

### 4. Security Review

- [ ] AI content filtering is enabled
- [ ] Rate limiting is configured
- [ ] API keys are properly secured
- [ ] CORS policies are set correctly
- [ ] Security headers are configured

## Deployment Steps

### 1. Local Validation

```bash
# Install dependencies
npm install

# Run deployment validation script
node scripts/deploy-production.js
```

### 2. Environment Variables

Create `.env.production.local` with production values:

```env
# Core Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# OpenAI
OPENAI_API_KEY=your-openai-key

# AI Configuration
AI_RATE_LIMIT_PER_MINUTE=60
AI_RATE_LIMIT_PER_DAY=10000
AI_MONITORING_ENABLED=true
```

### 3. Deploy to Vercel

```bash
# Deploy to production
vercel --prod

# Or use Git-based deployment
git push origin main
```

### 4. Post-Deployment Verification

```bash
# Check health endpoint
curl https://your-domain.com/api/health

# Test AI assistant
curl -X POST https://your-domain.com/api/ai/assistant \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, AI assistant"}'
```

## Production Configuration

### AI Model Configuration

The production configuration manager handles:

- **Model Selection**: Primary and fallback models
- **Feature Flags**: Enable/disable specific AI features
- **Rate Limiting**: Request limits per minute/day
- **Monitoring**: Error tracking and performance metrics

### Graceful Degradation

The AI service includes three degradation levels:

1. **Full Service**: All features enabled
2. **Partial Degradation**: Reduced features, simpler models
3. **Offline Mode**: Cached responses and calculator guidance

### Error Recovery

The fallback service includes:

- Retry logic with exponential backoff
- Circuit breaker pattern for failing models
- Model fallback chain (GPT-4 → GPT-3.5)
- Response caching for offline mode

## Monitoring

### Health Endpoint

Monitor the `/api/health` endpoint for:

```json
{
  "status": "healthy",
  "checks": {
    "database": { "status": "healthy", "latency": 45 },
    "ai_service": {
      "status": "healthy",
      "degradation_level": "full",
      "models": {
        "gpt-4-turbo-preview": { "available": true },
        "gpt-3.5-turbo": { "available": true }
      }
    },
    "configuration": {
      "status": "healthy",
      "environment": "production",
      "features": {
        "aiAssistant": true,
        "facadeAnalysis": true
      }
    }
  }
}
```

### Metrics to Monitor

1. **AI Usage**
   - Requests per minute/hour/day
   - Token consumption
   - Model usage distribution
   - Cache hit rate

2. **Performance**
   - Response times
   - Streaming latency
   - Error rates
   - Timeout frequency

3. **Degradation Events**
   - Service level changes
   - Circuit breaker activations
   - Fallback model usage

## Troubleshooting

### Common Issues

1. **AI Service Unavailable**
   - Check OpenAI API key and quota
   - Verify rate limits aren't exceeded
   - Check circuit breaker status

2. **Slow Performance**
   - Monitor token usage
   - Check cache configuration
   - Verify streaming is enabled

3. **High Error Rate**
   - Check model health status
   - Review content filtering logs
   - Verify API configuration

### Debug Mode

Enable debug logging:

```env
NEXT_PUBLIC_DEBUG=true
AI_DEBUG_MODE=true
```

### Recovery Procedures

1. **Reset Circuit Breakers**

   ```javascript
   // In production console
   aiFallbackService.resetModelHealth();
   ```

2. **Clear Cache**

   ```javascript
   aiGracefulDegradation.clearCache();
   ```

3. **Force Degradation Level**
   ```javascript
   aiGracefulDegradation.updateDegradationLevel({
     apiErrors: 0, // Reset to full service
   });
   ```

## Security Considerations

1. **API Key Security**
   - Use environment variables only
   - Rotate keys regularly
   - Monitor usage for anomalies

2. **Content Security**
   - AI content filtering enabled
   - Sensitive data masking active
   - Audit logging for compliance

3. **Rate Limiting**
   - Per-user limits enforced
   - IP-based rate limiting
   - Graceful degradation on limits

## Rollback Procedures

If issues arise:

1. **Immediate Rollback**

   ```bash
   vercel rollback
   ```

2. **Feature Flag Disable**

   ```env
   FEATURE_AI_ASSISTANT=false
   ```

3. **Emergency Offline Mode**
   - Set all AI models to unavailable
   - System will use cached responses

## Support

For deployment issues:

- Check `/api/health` endpoint
- Review deployment logs in Vercel
- Monitor OpenAI API dashboard
- Check Supabase logs for database issues
