# Guided Estimation Flow - Deployment Guide

## ⚠️ Critical Pre-Deployment Steps

### 1. Environment Setup

```bash
# Add to your .env file
NEXT_PUBLIC_ENABLE_GUIDED_FLOW=false  # Start disabled for safety
```

### 2. Database Migration (CRITICAL)

**⚠️ BACKUP YOUR DATABASE FIRST**

```bash
# 1. Create full database backup
# 2. Run the migration
psql -U postgres -h localhost -d estimatepro -f migration_guided_estimation_flow.sql

# 3. Verify migration success
# Check that tables exist: estimates, estimation_flows, customers
```

### 3. Update Package Dependencies

```bash
npm install @supabase/auth-helpers-nextjs
```

## 🚀 Deployment Sequence

### Phase 1: Backend Deployment

1. Deploy database migration
2. Deploy API endpoints
3. Deploy authentication middleware
4. **Test API endpoints thoroughly**

### Phase 2: Frontend Deployment (Feature Flagged)

1. Deploy updated frontend code
2. **Keep feature flag OFF** (`NEXT_PUBLIC_ENABLE_GUIDED_FLOW=false`)
3. Test that existing calculator still works
4. Verify no breaking changes to current workflows

### Phase 3: Gradual Rollout

1. Enable feature flag for testing: `NEXT_PUBLIC_ENABLE_GUIDED_FLOW=true`
2. Test guided flow with real data
3. Monitor for errors and performance issues
4. Rollout to production users

## 🔧 Testing Checklist

### Critical Tests Before Go-Live

- [ ] Existing calculator still works normally
- [ ] Quote creation/editing unchanged for current users
- [ ] All existing quote data accessible
- [ ] Authentication flows work correctly
- [ ] API endpoints require proper authentication
- [ ] Feature flag correctly shows/hides guided flow
- [ ] Guided flow saves data correctly
- [ ] Auto-save functionality works
- [ ] Mobile responsiveness tested

### Performance Tests

- [ ] Database migration completed successfully
- [ ] No significant performance degradation
- [ ] API response times acceptable
- [ ] Large photo uploads work correctly

## 🚨 Emergency Rollback Procedures

### Quick Rollback (Disable Feature)

```bash
# Immediately disable guided flow
export NEXT_PUBLIC_ENABLE_GUIDED_FLOW=false
# Redeploy frontend
```

### Database Rollback (If Migration Issues)

```bash
# Run rollback migration
psql -U postgres -h localhost -d estimatepro -f rollback_guided_estimation_flow.sql
```

### Full Application Rollback

```bash
# Rollback to previous Git commit
git checkout [previous-stable-commit]
npm run build && npm run deploy
```

## 📊 Monitoring & Alerts

### Key Metrics to Monitor

- API error rates
- Database performance
- User completion rates for guided flow
- Calculator vs guided flow usage
- Auto-save success rates

### Set Up Alerts For

- Database migration failures
- API authentication errors
- High error rates in guided flow
- Performance degradation

## 🔄 Post-Deployment Verification

### Immediate Checks (0-30 minutes)

1. Feature flag toggle works correctly
2. Existing calculator functionality intact
3. No 500 errors in logs
4. Database constraints working
5. Authentication middleware functioning

### 24-Hour Checks

1. No user complaints about broken features
2. Auto-save working correctly
3. Guided flow completion rates reasonable
4. Database performance stable
5. No memory leaks or performance issues

### 1-Week Review

1. User adoption of guided flow
2. Error rates vs. baseline
3. Performance impact assessment
4. User feedback collection
5. Business metric impact

## 📋 Implementation Status

### ✅ Completed

- [x] Rollback migration script created
- [x] Feature flag system implemented
- [x] Authentication middleware added
- [x] New estimate store with auto-save
- [x] API endpoints for estimation flows
- [x] Guided flow route integration
- [x] Backward compatibility maintained

### ⚠️ Required Before Production

- [ ] Run database migration
- [ ] Update existing components to use estimate store
- [ ] Comprehensive testing of all workflows
- [ ] Performance testing under load
- [ ] Security audit of new API endpoints

### 🔮 Future Enhancements

- [ ] Enhanced error handling
- [ ] Offline capability
- [ ] Advanced analytics
- [ ] A/B testing framework
- [ ] User onboarding flow

## 🆘 Emergency Contacts & Procedures

### Issue Escalation

1. **Feature Toggle Issues**: Disable via environment variable
2. **Database Issues**: Use rollback migration immediately
3. **Authentication Problems**: Check middleware configuration
4. **Performance Issues**: Monitor database queries and API calls

### Rollback Decision Matrix

| Issue Severity          | Response Time | Action                 |
| ----------------------- | ------------- | ---------------------- |
| Feature bugs            | 5 minutes     | Disable feature flag   |
| Auth issues             | 2 minutes     | Check middleware       |
| DB corruption           | Immediate     | Run rollback migration |
| Performance degradation | 15 minutes    | Monitor and assess     |

Remember: **Safety first** - it's better to disable the feature and investigate than to leave users with a broken experience.
