import { Tenant, MenuItem, TenantUser, HistoryRecord, Invoice, MasterStats, MasterOwnerProfile } from '../types/saas.ts';


export const saasApi = {
  // --- TENANTS ---
  async getTenants(): Promise<Tenant[]> {
    try {
      const res = await fetch('/api/tenants');
      if (!res.ok) throw new Error('Falha ao carregar bares');
      return await res.json();
    } catch (e) {
      console.warn('Erro na requisição /api/tenants, usando fallback local:', e);
      return [];
    }
  },

  async getTenant(id: string): Promise<Tenant | null> {
    try {
      const res = await fetch(`/api/tenants/${id}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async createTenant(data: Partial<Tenant>): Promise<Tenant> {
    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao criar bar');
    }
    return await res.json();
  },

  async updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant> {
    const res = await fetch(`/api/tenants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Erro ao atualizar bar');
    return await res.json();
  },

  async toggleBlockTenant(id: string): Promise<Tenant> {
    const res = await fetch(`/api/tenants/${id}/toggle-block`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Erro ao alterar status de bloqueio');
    return await res.json();
  },

  // --- CARDÁPIOS ---
  async getMenu(tenantId: string): Promise<MenuItem[]> {
    try {
      const res = await fetch(`/api/tenants/${tenantId}/menu`);
      if (!res.ok) throw new Error('Erro ao buscar cardápio');
      return await res.json();
    } catch (e) {
      console.warn('Falha ao obter cardápio remoto:', e);
      return [];
    }
  },

  async saveMenu(tenantId: string, items: MenuItem[]): Promise<MenuItem[]> {
    const res = await fetch(`/api/tenants/${tenantId}/menu`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    if (!res.ok) throw new Error('Erro ao salvar cardápio');
    return await res.json();
  },

  async addMenuItem(tenantId: string, item: MenuItem): Promise<MenuItem[]> {
    const res = await fetch(`/api/tenants/${tenantId}/menu/item`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error('Erro ao adicionar item');
    return await res.json();
  },

  async removeMenuItem(tenantId: string, itemName: string): Promise<MenuItem[]> {
    const res = await fetch(`/api/tenants/${tenantId}/menu/item/${encodeURIComponent(itemName)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Erro ao remover item');
    return await res.json();
  },

  // --- FECHAMENTOS NA NUVEM (FASE 1 & 2) ---
  async getClosings(tenantId: string): Promise<HistoryRecord[]> {
    try {
      const res = await fetch(`/api/tenants/${tenantId}/closings`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async saveClosing(tenantId: string, record: Omit<HistoryRecord, 'id' | 'createdAt'>): Promise<HistoryRecord> {
    const res = await fetch(`/api/tenants/${tenantId}/closings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    if (!res.ok) throw new Error('Erro ao salvar fechamento na nuvem');
    return await res.json();
  },

  async deleteClosing(tenantId: string, closingId: number): Promise<boolean> {
    const res = await fetch(`/api/tenants/${tenantId}/closings/${closingId}`, {
      method: 'DELETE',
    });
    return res.ok;
  },

  // --- OPERADORES POR BAR ---
  async getUsers(tenantId: string): Promise<TenantUser[]> {
    try {
      const res = await fetch(`/api/tenants/${tenantId}/users`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async addUser(tenantId: string, user: { name: string; pin: string; isAdmin: boolean }): Promise<TenantUser> {
    const res = await fetch(`/api/tenants/${tenantId}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao adicionar operador');
    }
    return await res.json();
  },

  async updateUser(tenantId: string, userId: number, updates: Partial<TenantUser>): Promise<TenantUser> {
    const res = await fetch(`/api/tenants/${tenantId}/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Erro ao atualizar operador');
    return await res.json();
  },

  async deleteUser(tenantId: string, userId: number): Promise<boolean> {
    const res = await fetch(`/api/tenants/${tenantId}/users/${userId}`, {
      method: 'DELETE',
    });
    return res.ok;
  },

  // --- COBRANÇAS / ASSINATURA (FASE 4) ---
  async getInvoices(tenantId: string): Promise<Invoice[]> {
    try {
      const res = await fetch(`/api/tenants/${tenantId}/billing/invoices`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async createInvoice(tenantId: string, amount?: number): Promise<Invoice> {
    const res = await fetch(`/api/tenants/${tenantId}/billing/create-invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    });
    if (!res.ok) throw new Error('Erro ao gerar fatura');
    return await res.json();
  },

  async confirmPayment(invoiceId: string): Promise<{ invoice: Invoice; tenant: Tenant }> {
    const res = await fetch('/api/billing/confirm-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao confirmar pagamento');
    }
    return await res.json();
  },

  // --- MASTER PANEL (FASE 3) ---
  async verifyMasterPin(pin: string): Promise<boolean> {
    try {
      const res = await fetch('/api/master/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async loginMaster(email?: string, pin?: string): Promise<{ success: boolean; owner?: MasterOwnerProfile; error?: string }> {
    try {
      const res = await fetch('/api/master/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Falha no login master' };
      }
      return { success: true, owner: data.owner };
    } catch (e: any) {
      return { success: false, error: e.message || 'Erro de conexão' };
    }
  },

  async getMasterProfile(): Promise<MasterOwnerProfile | null> {
    try {
      const res = await fetch('/api/master/profile');
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async updateMasterProfile(profile: Partial<MasterOwnerProfile>): Promise<MasterOwnerProfile> {
    const res = await fetch('/api/master/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao atualizar perfil do dono');
    }
    return await res.json();
  },

  async getMasterStats(): Promise<MasterStats | null> {
    try {
      const res = await fetch('/api/master/stats');
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },
};
