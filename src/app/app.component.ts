import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, firstValueFrom } from 'rxjs';

interface LoginResponse {
  token: string;
  rol?: 'ROLE_ADMIN' | 'ROLE_CLIENTE' | string;
  username?: string;
  idcliente?: number | null;
}

interface RegisterResponse {
  mensaje?: string;
  idusuario?: number;
  idcliente?: number;
  username?: string;
  rol?: string;
}

interface Cliente {
  idcliente: number;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  estado: string | boolean;
}

interface Producto {
  idproducto: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  stock: number;
}

interface Venta {
  idventa: number;
  idcliente: number;
  idproducto: number;
  cantidad: number;
  total?: number;
  estado?: string;
  fecha?: string;
}

interface SagaResponse {
  sagaId?: string;
  estado?: string;
  mensaje?: string;
  venta?: Venta;
}

type AdminTab = 'resumen' | 'clientes' | 'productos' | 'ventas' | 'saga';
type ClientTab = 'tienda' | 'historial';

type Trackable = Cliente | Producto | Venta;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe, DecimalPipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  readonly token = signal(localStorage.getItem('saga_token') ?? '');
  readonly role = signal(localStorage.getItem('saga_role') ?? '');
  readonly username = signal(localStorage.getItem('saga_username') ?? '');
  readonly idcliente = signal(Number(localStorage.getItem('saga_idcliente') || 0) || null);

  readonly adminTab = signal<AdminTab>('resumen');
  readonly clientTab = signal<ClientTab>('tienda');
  readonly authMode = signal<'login' | 'register'>('login');
  readonly showAdminLogin = signal(false);
  readonly loading = signal(false);
  readonly actionLoading = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly clientAuthError = signal('');
  readonly clientAuthSuccess = signal('');
  readonly adminAuthError = signal('');

  readonly clientes = signal<Cliente[]>([]);
  readonly productos = signal<Producto[]>([]);
  readonly ventas = signal<Venta[]>([]);
  readonly misVentas = signal<Venta[]>([]);
  readonly lastSaga = signal<SagaResponse | null>(null);

  clientLogin = {
    username: '',
    password: ''
  };

  adminLogin = {
    username: 'admin',
    password: 'admin123'
  };

  registerForm = {
    username: '',
    password: '',
    nombres: '',
    apellidos: '',
    correo: '',
    telefono: ''
  };

  clientBuyForm = {
    idproducto: 21,
    cantidad: 1
  };

  adminSaleForm = {
    idcliente: 1,
    idproducto: 21,
    cantidad: 1
  };

  productForm = {
    idproducto: null as number | null,
    nombre: '',
    descripcion: '',
    precio: 0,
    stock: 0
  };

  clienteForm = {
    idcliente: null as number | null,
    nombres: '',
    apellidos: '',
    correo: '',
    telefono: '',
    estado: true
  };

  readonly isLoggedIn = computed(() => Boolean(this.token()));
  readonly isAdmin = computed(() => this.role() === 'ROLE_ADMIN');
  readonly isClient = computed(() => this.role() === 'ROLE_CLIENTE');

  readonly selectedAdminCliente = computed(() =>
    this.clientes().find((cliente) => cliente.idcliente === Number(this.adminSaleForm.idcliente))
  );

  readonly selectedAdminProducto = computed(() =>
    this.productos().find((producto) => producto.idproducto === Number(this.adminSaleForm.idproducto))
  );

  readonly selectedClientProducto = computed(() =>
    this.productos().find((producto) => producto.idproducto === Number(this.clientBuyForm.idproducto))
  );

  readonly adminEstimatedTotal = computed(() => {
    const producto = this.selectedAdminProducto();
    return producto ? producto.precio * Number(this.adminSaleForm.cantidad || 0) : 0;
  });

  readonly clientEstimatedTotal = computed(() => {
    const producto = this.selectedClientProducto();
    return producto ? producto.precio * Number(this.clientBuyForm.cantidad || 0) : 0;
  });

  readonly activeClientes = computed(() =>
    this.clientes().filter((cliente) => this.isClienteActive(cliente)).length
  );

  readonly totalStock = computed(() =>
    this.productos().reduce((sum, producto) => sum + Number(producto.stock || 0), 0)
  );

  readonly catalogoDisponible = computed(() =>
    this.productos().filter((producto) => Number(producto.stock || 0) > 0)
  );

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    if (this.isAdmin()) {
      this.loadAdminDashboard();
    }
    if (this.isClient()) {
      this.loadClientStore();
    }
  }

  doClientLogin(): void {
    this.doLogin(this.clientLogin, 'client');
  }

  doAdminLogin(): void {
    this.doLogin(this.adminLogin, 'admin');
  }

  registerClient(): void {
    this.clearAuthMessages();
    this.actionLoading.set(true);

    this.http.post<RegisterResponse>('/api/auth/register-cliente', this.registerForm)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.clientLogin.username = response.username || this.registerForm.username;
          this.clientLogin.password = this.registerForm.password;
          this.authMode.set('login');
          this.clientAuthSuccess.set(response.mensaje || 'Cuenta cliente creada. Ya puedes iniciar sesion.');
        },
        error: (err) => this.clientAuthError.set(this.readError(err, 'No se pudo crear la cuenta.'))
      });
  }

  confirmLogout(): void {
    if (window.confirm('Estas seguro que quieres cerrar sesion?')) {
      this.logout();
    }
  }

  logout(): void {
    localStorage.removeItem('saga_token');
    localStorage.removeItem('saga_role');
    localStorage.removeItem('saga_username');
    localStorage.removeItem('saga_idcliente');
    this.token.set('');
    this.role.set('');
    this.username.set('');
    this.idcliente.set(null);
    this.clientes.set([]);
    this.productos.set([]);
    this.ventas.set([]);
    this.misVentas.set([]);
    this.lastSaga.set(null);
    this.adminTab.set('resumen');
    this.clientTab.set('tienda');
    this.showAdminLogin.set(false);
    this.clearMessages();
      this.clearAuthMessages();
  }

  loadAdminDashboard(): void {
    this.clearMessages();
    this.loading.set(true);

    Promise.all([
      firstValueFrom(this.http.get<Cliente[] | { value: Cliente[] }>('/api/clientes')),
      firstValueFrom(this.http.get<Producto[] | { value: Producto[] }>('/api/productos')),
      firstValueFrom(this.http.get<Venta[] | { value: Venta[] }>('/api/ventas'))
    ])
      .then(([clientes, productos, ventas]) => {
        this.clientes.set(this.asArray<Cliente>(clientes));
        this.productos.set(this.asArray<Producto>(productos));
        this.ventas.set(this.asArray<Venta>(ventas));
        this.ensureDefaultSelections();
      })
      .catch((err) => this.error.set(this.readError(err, 'No se pudieron cargar los datos de administracion.')))
      .finally(() => this.loading.set(false));
  }

  loadClientStore(): void {
    this.clearMessages();
    this.loading.set(true);

    Promise.all([
      firstValueFrom(this.http.get<Producto[] | { value: Producto[] }>('/api/productos')),
      firstValueFrom(this.http.get<Venta[] | { value: Venta[] }>('/api/ventas/mis-ventas'))
    ])
      .then(([productos, ventas]) => {
        this.productos.set(this.asArray<Producto>(productos));
        this.misVentas.set(this.asArray<Venta>(ventas));
        this.ensureDefaultSelections();
      })
      .catch((err) => this.error.set(this.readError(err, 'No se pudo cargar tu tienda.')))
      .finally(() => this.loading.set(false));
  }

  createClientSale(producto?: Producto): void {
    if (producto) {
      this.clientBuyForm.idproducto = producto.idproducto;
    }

    this.clearMessages();
    this.actionLoading.set(true);
    this.lastSaga.set(null);

    const payload = {
      idproducto: Number(this.clientBuyForm.idproducto),
      cantidad: Number(this.clientBuyForm.cantidad)
    };

    this.http.post<SagaResponse>('/api/ventas/saga/cliente', payload)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.lastSaga.set(response);
          this.success.set(response.mensaje || 'Compra completada. Tu venta fue registrada.');
          this.loadClientStore();
        },
        error: (err) => {
          this.error.set(this.readError(err, 'La compra no se pudo completar.'));
          this.loadClientStore();
        }
      });
  }

  createAdminSale(): void {
    this.clearMessages();
    this.actionLoading.set(true);
    this.lastSaga.set(null);

    const payload = {
      idcliente: Number(this.adminSaleForm.idcliente),
      idproducto: Number(this.adminSaleForm.idproducto),
      cantidad: Number(this.adminSaleForm.cantidad)
    };

    this.http.post<SagaResponse>('/api/ventas/saga', payload)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.lastSaga.set(response);
          this.success.set(response.mensaje || 'Saga administrativa completada.');
          this.loadAdminDashboard();
        },
        error: (err) => {
          this.error.set(this.readError(err, 'La Saga fallo de forma controlada.'));
          this.loadAdminDashboard();
        }
      });
  }

  saveProducto(): void {
    this.clearMessages();
    this.actionLoading.set(true);

    const payload = {
      nombre: this.productForm.nombre,
      descripcion: this.productForm.descripcion,
      precio: Number(this.productForm.precio),
      stock: Number(this.productForm.stock)
    };

    const request = this.productForm.idproducto
      ? this.http.put<Producto>(`/api/productos/${this.productForm.idproducto}`, payload)
      : this.http.post<Producto>('/api/productos', payload);

    request.pipe(finalize(() => this.actionLoading.set(false))).subscribe({
      next: () => {
        this.success.set(this.productForm.idproducto ? 'Producto actualizado.' : 'Producto creado.');
        this.resetProductoForm();
        this.loadAdminDashboard();
      },
      error: (err) => this.error.set(this.readError(err, 'No se pudo guardar el producto.'))
    });
  }

  editProducto(producto: Producto): void {
    this.productForm = {
      idproducto: producto.idproducto,
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      precio: Number(producto.precio || 0),
      stock: Number(producto.stock || 0)
    };
    this.adminTab.set('productos');
    this.clearMessages();
  }

  deleteProducto(producto: Producto): void {
    this.clearMessages();
    this.actionLoading.set(true);

    this.http.delete(`/api/productos/${producto.idproducto}`)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: () => {
          this.success.set('Producto eliminado.');
          this.loadAdminDashboard();
        },
        error: (err) => this.error.set(this.readError(err, 'No se pudo eliminar el producto.'))
      });
  }

  saveCliente(): void {
    this.clearMessages();
    this.actionLoading.set(true);

    const payload = {
      nombres: this.clienteForm.nombres,
      apellidos: this.clienteForm.apellidos,
      correo: this.clienteForm.correo,
      telefono: this.clienteForm.telefono,
      estado: this.clienteForm.estado
    };

    const request = this.clienteForm.idcliente
      ? this.http.put<Cliente>(`/api/clientes/${this.clienteForm.idcliente}`, payload)
      : this.http.post<Cliente>('/api/clientes', payload);

    request.pipe(finalize(() => this.actionLoading.set(false))).subscribe({
      next: () => {
        this.success.set(this.clienteForm.idcliente ? 'Cliente actualizado.' : 'Cliente creado.');
        this.resetClienteForm();
        this.loadAdminDashboard();
      },
      error: (err) => this.error.set(this.readError(err, 'No se pudo guardar el cliente.'))
    });
  }

  editCliente(cliente: Cliente): void {
    this.clienteForm = {
      idcliente: cliente.idcliente,
      nombres: cliente.nombres,
      apellidos: cliente.apellidos,
      correo: cliente.correo,
      telefono: cliente.telefono,
      estado: this.isClienteActive(cliente)
    };
    this.adminTab.set('clientes');
    this.clearMessages();
  }

  deleteCliente(cliente: Cliente): void {
    this.clearMessages();
    this.actionLoading.set(true);

    this.http.delete(`/api/clientes/${cliente.idcliente}`)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: () => {
          this.success.set('Cliente eliminado.');
          this.loadAdminDashboard();
        },
        error: (err) => this.error.set(this.readError(err, 'No se pudo eliminar el cliente.'))
      });
  }

  resetProductoForm(): void {
    this.productForm = {
      idproducto: null,
      nombre: '',
      descripcion: '',
      precio: 0,
      stock: 0
    };
  }

  resetClienteForm(): void {
    this.clienteForm = {
      idcliente: null,
      nombres: '',
      apellidos: '',
      correo: '',
      telefono: '',
      estado: true
    };
  }

  simulateAdminStockError(): void {
    this.adminSaleForm.cantidad = 999999;
    this.createAdminSale();
  }

  selectAdminTab(tab: AdminTab): void {
    this.adminTab.set(tab);
    this.clearMessages();
  }

  selectClientTab(tab: ClientTab): void {
    this.clientTab.set(tab);
    this.clearMessages();
  }

  trackById(_index: number, item: Trackable): number {
    if ('idventa' in item) {
      return item.idventa;
    }
    if ('idproducto' in item) {
      return item.idproducto;
    }
    return item.idcliente;
  }

  private doLogin(credentials: { username: string; password: string }, context: 'client' | 'admin'): void {
    this.clearAuthMessages();
    this.actionLoading.set(true);

    this.http.post<LoginResponse>('/api/auth/login', credentials)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.storeSession(response, credentials.username);
          if (context === 'client') {
            this.clientAuthSuccess.set('Sesion iniciada correctamente.');
          }

          if (this.isAdmin()) {
            this.showAdminLogin.set(false);
            this.loadAdminDashboard();
            return;
          }

          if (this.isClient()) {
            this.loadClientStore();
            return;
          }

          this.setAuthError(context, 'Rol no reconocido por el frontend.');
        },
        error: (err) => this.setAuthError(context, this.readError(err, 'No se pudo iniciar sesion.'))
      });
  }

  private storeSession(response: LoginResponse, fallbackUsername: string): void {
    const role = response.rol || 'ROLE_CLIENTE';
    const idcliente = response.idcliente ?? null;
    const username = response.username || fallbackUsername;

    localStorage.setItem('saga_token', response.token);
    localStorage.setItem('saga_role', role);
    localStorage.setItem('saga_username', username);

    if (idcliente) {
      localStorage.setItem('saga_idcliente', String(idcliente));
    } else {
      localStorage.removeItem('saga_idcliente');
    }

    this.token.set(response.token);
    this.role.set(role);
    this.username.set(username);
    this.idcliente.set(idcliente);
  }

  private ensureDefaultSelections(): void {
    const firstProduct = this.productos()[0];
    const firstCliente = this.clientes()[0];

    if (firstProduct && !this.productos().some((producto) => producto.idproducto === Number(this.clientBuyForm.idproducto))) {
      this.clientBuyForm.idproducto = firstProduct.idproducto;
    }
    if (firstProduct && !this.productos().some((producto) => producto.idproducto === Number(this.adminSaleForm.idproducto))) {
      this.adminSaleForm.idproducto = firstProduct.idproducto;
    }
    if (firstCliente && !this.clientes().some((cliente) => cliente.idcliente === Number(this.adminSaleForm.idcliente))) {
      this.adminSaleForm.idcliente = firstCliente.idcliente;
    }
  }

  private isClienteActive(cliente: Cliente): boolean {
    return cliente.estado === true || cliente.estado === 'A' || cliente.estado === 'ACTIVO';
  }

  clearMessages(): void {
    this.error.set('');
    this.success.set('');
  }

  clearAuthMessages(): void {
    this.clientAuthError.set('');
    this.clientAuthSuccess.set('');
    this.adminAuthError.set('');
  }

  private setAuthError(context: 'client' | 'admin', message: string): void {
    if (context === 'admin') {
      this.adminAuthError.set(message);
      return;
    }
    this.clientAuthError.set(message);
  }

  private asArray<T>(value: T[] | { value: T[] } | undefined | null): T[] {
    if (Array.isArray(value)) {
      return value;
    }
    if (value && 'value' in value && Array.isArray(value.value)) {
      return value.value;
    }
    return [];
  }

  private readError(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (typeof body === 'string' && body.trim()) {
        return `${fallback} ${body}`;
      }
      if (body?.message) {
        return `${fallback} ${body.message}`;
      }
      if (body?.error) {
        return `${fallback} ${body.error}`;
      }
      if (err.status === 0) {
        return `${fallback} No hay conexion con el backend.`;
      }
      return `${fallback} Codigo HTTP ${err.status}.`;
    }
    return fallback;
  }
}
