import { useState, useEffect } from 'react';
import { supabase, type DatabaseSecurityEvent } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminSkeleton, AdminStatusBadge, AdminDataTable, AdminEmptyState } from '../components/admin/AdminPrimitives';

export default function AdminSecurityCenter() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<DatabaseSecurityEvent[]>([]);

  const fetchSecurityEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setEvents(data || []);
    } catch (err: any) {
      console.error('Fetch security events error:', err);
      showToast('Failed to load security audit log.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = [
    { 
      header: 'Timestamp', 
      render: (ev: DatabaseSecurityEvent) => <span className="font-mono text-xs text-[#71717a]">{new Date(ev.created_at).toLocaleString('en-IN')}</span> 
    },
    { 
      header: 'Event Type', 
      render: (ev: DatabaseSecurityEvent) => <span className="font-mono text-xs font-semibold text-[#000000]">{ev.event_type}</span> 
    },
    { 
      header: 'Severity', 
      render: (ev: DatabaseSecurityEvent) => <AdminStatusBadge status={ev.severity} /> 
    },
    { 
      header: 'Actor User ID', 
      render: (ev: DatabaseSecurityEvent) => <span className="font-mono text-xs text-[#71717a]">{ev.actor_user_id ? `${ev.actor_user_id.slice(0, 8)}...` : 'System'}</span> 
    },
    { 
      header: 'Entity Type', 
      render: (ev: DatabaseSecurityEvent) => <span className="font-mono text-xs text-[#000000]">{ev.entity_type || 'N/A'}</span> 
    },
    { 
      header: 'Entity ID', 
      render: (ev: DatabaseSecurityEvent) => <span className="font-mono text-xs text-[#71717a]">{ev.entity_id || 'N/A'}</span> 
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-5 pb-12">
        {/* Title Subheader */}
        <div className="pb-3 border-b border-[#e4e4e7]">
          <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider">Security & Compliance Operations Center</span>
          <p className="text-xs text-[#71717a] margin-0">Read-only monitoring for Row Level Security (RLS), atomic rate-limiting, and security audit events</p>
        </div>

        {/* Security Health Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
          <AdminCard>
            <span className="text-[0.68rem] font-semibold text-[#71717a] uppercase tracking-wider block">Supabase Auth MFA & AAL2</span>
            <span className="text-sm font-bold font-mono text-[#000000] mt-1 block">ENFORCED</span>
            <span className="text-[0.7rem] text-[#71717a] block mt-0.5">AAL2 Step-Up on High-Risk Actions</span>
          </AdminCard>

          <AdminCard>
            <span className="text-[0.68rem] font-semibold text-[#71717a] uppercase tracking-wider block">Atomic Rate Limiting</span>
            <span className="text-sm font-bold font-mono text-[#000000] mt-1 block">ACTIVE (DB BUCKETS)</span>
            <span className="text-[0.7rem] text-[#71717a] block mt-0.5">Endpoint-Specific Token Buckets</span>
          </AdminCard>

          <AdminCard>
            <span className="text-[0.68rem] font-semibold text-[#71717a] uppercase tracking-wider block">Statutory GST Retention</span>
            <span className="text-sm font-bold font-mono text-[#000000] mt-1 block">8 YEARS (CGST ACT 2017)</span>
            <span className="text-[0.7rem] text-[#71717a] block mt-0.5">Immutable Historical Record Preservation</span>
          </AdminCard>

          <AdminCard>
            <span className="text-[0.68rem] font-semibold text-[#71717a] uppercase tracking-wider block">Disaster Recovery (PITR)</span>
            <span className="text-sm font-bold font-mono text-[#000000] mt-1 block">MANUAL VERIFICATION</span>
            <span className="text-[0.7rem] text-[#71717a] block mt-0.5">Runbook: docs/DISASTER_RECOVERY.md</span>
          </AdminCard>
        </div>

        {/* Security Audit Event Log Table Workspace */}
        <AdminCard className="space-y-3 p-0 overflow-hidden">
          <div className="p-3.5 border-b border-[#f4f4f0] flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#71717a] m-0">
              Sanitized Security Audit Log (Top 50 Recent Events)
            </h3>
          </div>

          {loading ? (
            <AdminSkeleton type="table" rows={4} />
          ) : events.length === 0 ? (
            <AdminEmptyState
              title="No Security Violations Recorded"
              description="System is operating under strict RLS rules, atomic rate-limiting, and sanitized logging."
            />
          ) : (
            <AdminDataTable
              columns={columns}
              data={events}
              keyExtractor={(ev) => ev.id}
            />
          )}
        </AdminCard>
      </div>
    </AdminLayout>
  );
}
