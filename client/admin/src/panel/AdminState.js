function formatInputDate(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getInitialAdminState() {
  const today = new Date();
  const customRangeTo = formatInputDate(today);
  const customRangeFrom = (() => {
    const date = new Date(today);
    date.setDate(date.getDate() - 29);
    return formatInputDate(date);
  })();

  return {
    activeTab: "dashboard",
    showSearch: false,
    menuItems: [
      { id: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
      { id: "inventory", label: "Inventory", icon: "package" },
      { id: "media", label: "Media", icon: "image" },
      { id: "auctions", label: "Auctions", icon: "flame" },
      { id: "orders", label: "Orders", icon: "receipt" },
      { id: "users", label: "Users", icon: "users" },
      { id: "subscribers", label: "Subscribers", icon: "mail" },
      { id: "campaigns", label: "Campaigns", icon: "megaphone" },
      { id: "coupons", label: "Coupons", icon: "ticket-percent" },
      { id: "analytics", label: "Analytics", icon: "trending-up" },
      { id: "reports", label: "Reports", icon: "file-text" },
      { id: "settings", label: "Settings", icon: "settings" }
    ],

    // auth and api
    apiBase: import.meta.env.VITE_API_BASE
      ? String(import.meta.env.VITE_API_BASE).replace(/\/$/, "")
      : "/api",
    csrfTokenCache: null,
    csrfTokenRequest: null,
    authUser: null,

    // ui
    isLoading: false,
    loadedTabs: {},
    toast: { show: false, type: "info", message: "" },
    toastTimer: null,

    // dashboard
    kpisRow1: [],
    kpisRow2: [],
    inventoryStats: {
      totalProducts: 0,
      netAssetValue: 0,
      outOfStock: 0,
      reservedUnits: 0,
      totalUnits: 0,
      stockHealth: 0
    },
    recentOrders: [],
    endingAuctions: [],
    topProducts: [],
    topBuyers: [],

    // inventory
    inventory: [],
    inventoryView: "products",
    inventoryFilters: {
      search: "",
      saleMode: "All Sale Modes"
    },
    inventorySelection: {},
    inventoryDeleting: false,
    inventoryTrashMode: false,
    inventoryDeleteModal: null,
    categories: [],
    categoryFilters: {
      search: ""
    },
    categoryEditor: {
      id: "",
      name: "",
      slug: "",
      description: ""
    },
    categorySaving: false,
    categoryDeletingId: "",
    mediaAssets: [],
    mediaViewMode: "columns",
    mediaTrashMode: false,
    mediaDeleteModal: null,
    mediaFilters: {
      search: "",
      page: 1,
      limit: 30
    },
    mediaMeta: {
      page: 1,
      limit: 30,
      total: 0,
      totalPages: 1
    },
    mediaSelection: {},
    mediaUpload: {
      files: [],
      uploading: false
    },

    // auctions
    auctionCards: [],
    auctionFilters: {
      search: "",
      status: ""
    },
    auctionDetailsModal: {
      open: false,
      loading: false,
      saving: false,
      detail: null,
      draft: {
        status: "scheduled",
        startAt: "",
        endAt: "",
        startingPrice: "",
        reservePrice: "",
        minIncrement: "1"
      }
    },

    // orders
    orders: [],
    orderFilters: {
      status: "",
      paymentStatus: "",
      page: 1,
      limit: 20
    },
    ordersMeta: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1
    },
    orderDrafts: {},
    orderSelection: {},
    ordersDeleting: false,
    ordersBulkUpdating: false,
    ordersBulkSending: false,
    orderBulkDraft: {
      paymentStatus: "",
      fulfillmentStatus: ""
    },
    orderDetailsModal: {
      open: false,
      loading: false,
      saving: false,
      order: null,
      catalog: [],
      catalogQuery: "",
      catalogLoading: false,
      productSearch: "",
      productToAddId: "",
      draft: {
        paymentStatus: "unpaid",
        fulfillmentStatus: "pending",
        customerNote: "",
        shippingFee: "0",
        discount: "0",
        items: [],
        shippingAddress: {
          fullName: "",
          phone: "",
          addressLine1: "",
          addressLine2: "",
          area: "",
          city: "",
          postalCode: "",
          country: "BD"
        }
      }
    },
    courierSuccessModal: {
      open: false,
      loading: false,
      orderId: "",
      orderNumber: "",
      phoneNumber: "",
      totalOrders: 0,
      totalDelivered: 0,
      totalCancelled: 0,
      successRatio: 0,
      hasFraudHistory: false,
      fraudCount: 0,
      cached: false,
      stale: false,
      warning: "",
      error: ""
    },
    courierSuccessSnapshots: {},

    // users
    users: [],
    userFilters: {
      page: 1,
      limit: 20
    },
    usersMeta: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1
    },
    selectedUserDetails: null,
    userDetailsDraft: {
      name: "",
      email: "",
      phone: "",
      role: "customer",
      isSuspended: false,
      shippingAddress: {
        fullName: "",
        phone: "",
        addressLine1: "",
        addressLine2: "",
        area: "",
        city: "",
        postalCode: "",
        country: "BD"
      }
    },
    userDetailsLoading: false,
    userDetailsSaving: false,
    usersImport: {
      file: null,
      fileName: "",
      importing: false
    },

    // subscribers
    subscribers: [],
    subscriberFilters: {
      search: "",
      isActive: "",
      page: 1,
      limit: 20
    },
    subscriberDraft: {
      email: "",
      name: "",
      source: "manual",
      isActive: true
    },

    // campaigns
    campaigns: [],
    campaignTemplates: [],
    selectedCampaignTemplateId: "",
    campaignTemplateName: "",
    campaignDraft: {
      subject: "",
      html: "",
      hourlyRateLimit: "0",
      dailyRateLimit: "0"
    },
    campaignPreview: {
      open: false,
      loading: false,
      subject: "",
      html: ""
    },
    emailMediaPicker: {
      open: false,
      loading: false,
      target: "template",
      search: "",
      alt: ""
    },

    // reports
    financialSummary: {
      gmv: 0,
      netRevenue: 0,
      feesCollected: 0,
      conversionRate: 0,
      avgAuctionUplift: 0,
      walletBalances: { total: 0, locked: 0 },
      monthlyReport: []
    },
    wallets: [],
    reservations: {
      active: [],
      expired: [],
      consumed: []
    },
    coupons: [],
    couponFilters: {
      isActive: ""
    },
    couponDraft: {
      code: "",
      type: "percent",
      value: "",
      maxUses: "",
      expiresAt: "",
      minOrderAmount: "0",
      appliesTo: "both",
      isActive: true
    },
    disputes: [],
    disputeFilters: {
      status: ""
    },
    disputeDrafts: {},
    systemHealth: {
      api: "unknown",
      dependencies: "unknown",
      lastCheckedAt: null
    },

    // settings/email templates
    templateKeys: [],
    templateEditor: {
      selectedKey: "",
      key: "",
      subjectTemplate: "",
      htmlTemplate: "",
      testEmail: ""
    },
    templatePreview: {
      subject: "",
      html: ""
    },
    smtpSettings: {
      enabled: false,
      host: "",
      port: 465,
      secure: true,
      username: "",
      password: "",
      hasPassword: false,
      passwordMasked: "",
      fromEmail: "",
      fromName: "",
      replyTo: "",
      ignoreTLS: false,
      testEmail: "",
      saving: false,
      testing: false
    },
    templatePlaceholders: [
      "customer.name",
      "customer.email",
      "order.number",
      "order.total",
      "order.status",
      "order.payment_status",
      "order.items_table",
      "order.items_table_with_images",
      "shipping.address",
      "shipping.city",
      "site.name",
      "site.url",
      "support.email",
      "auth.login_link",
      "auth.reset_link",
      "auction.title",
      "product.title"
    ],
    localSettings: {
      autoRefresh: false,
      debug: false,
      sidebarCollapsed: true,
      auctionView: "grid"
    },
    courierSettings: {
      provider: "steadfast",
      enabled: false,
      baseUrl: "https://portal.packzy.com/api/v1",
      apiKey: "",
      secretKey: "",
      hasSecret: false,
      secretKeyMasked: "",
      fraudCheckerEnabled: false,
      fraudCheckerEmail: "",
      fraudCheckerPassword: "",
      fraudCheckerHasPassword: false,
      fraudCheckerPasswordMasked: "",
      defaultDeliveryType: 0,
      defaultItemDescription: "BidnSteal order",
      balance: null,
      balanceLoading: false,
      saving: false
    },

    // product modal
    productModal: {
      open: false,
      mode: "create",
      saving: false,
      productId: "",
      form: {
        title: "",
        slug: "",
        price: "",
        sku: "",
        categoryId: "",
        category: "",
        stock: "",
        condition: "carded",
        saleMode: "fixed",
        primaryImage: "",
        galleryImages: "",
        tags: "",
        description: "",
        isFeatured: false,
        isNewDrop: false,
        auctionStartAt: "",
        auctionEndAt: "",
        auctionStartingPrice: "",
        auctionReservePrice: "",
        auctionMinIncrement: "1"
      }
    },
    productMediaPicker: {
      open: false,
      search: "",
      loading: false
    },

    // auction modal
    auctionModal: {
      open: false,
      saving: false,
      form: {
        productId: "",
        startAt: "",
        endAt: "",
        startingPrice: "",
        reservePrice: "",
        minIncrement: "1"
      }
    },

    charts: {
      revenue: null,
      ordersPie: null
    },
    revenueWindow: "7d",
    revenueTelemetryLoading: false,
    revenueTelemetryMeta: {
      range: "7d",
      bucket: "day",
      from: "",
      to: "",
      total: 0
    },
    revenueCustomRange: {
      from: customRangeFrom,
      to: customRangeTo
    },
    revenueSeries: {
      "7d": { labels: [], values: [] },
      "1m": { labels: [], values: [] },
      "6m": { labels: [], values: [] },
      "12m": { labels: [], values: [] },
      custom: { labels: [], values: [] }
    },
  };
}
