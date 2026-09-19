<template>
  <aside class="sidebar" :class="{ 'sidebar--mobile-open': mobileOpen }">
    <div class="sidebar-header">
      <img src="/logo_geomtech.jpg" alt="Geomtech" class="sidebar-logo" />
      <button
        type="button"
        class="sidebar-close-btn"
        aria-label="Cerrar menú"
        @click="emit('close')"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </div>

    <nav class="sidebar-nav">
      <!-- Admin navigation -->
      <template v-if="!userStore.isFieldRole">
        <button
          class="nav-item"
          :class="{ active: isActive('/inicio') }"
          @click="goTo('/inicio')"
        >
          <span class="nav-icon nav-icon-svg" aria-hidden="true">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </span>
          <span class="nav-label">Inicio</span>
        </button>
        <button
          class="nav-item"
          :class="{ active: route.path.startsWith('/cotizaciones') }"
          @click="goTo('/cotizaciones')"
        >
          <span class="nav-icon nav-icon-svg" aria-hidden="true">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
              />
              <polyline points="14 2 14 8 20 8" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="8" y1="16" x2="16" y2="16" />
              <line x1="8" y1="20" x2="12" y2="20" />
            </svg>
          </span>
          <span class="nav-label">Cotizaciones</span>
        </button>
        <button
          class="nav-item"
          :class="{ active: route.path.startsWith('/proyectos') }"
          @click="goTo('/proyectos')"
        >
          <span class="nav-icon nav-icon-svg" aria-hidden="true">
            <svg
              fill="#ffffff"
              height="200px"
              width="200px"
              version="1.1"
              id="Layer_1"
              xmlns="http://www.w3.org/2000/svg"
              xmlns:xlink="http://www.w3.org/1999/xlink"
              viewBox="0 0 489.347 489.347"
              xml:space="preserve"
              stroke="#ffffff"
            >
              <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
              <g
                id="SVGRepo_tracerCarrier"
                stroke-linecap="round"
                stroke-linejoin="round"
              ></g>
              <g id="SVGRepo_iconCarrier">
                <g>
                  <path
                    d="M412.642,345.939l-59.523-14.229l-66.352-66.352l51.12-51.055c11.874,4.167,24.216,6.203,36.499,6.202 c28.736-0.002,57.122-11.149,78.233-32.221c32.686-32.626,41.544-82.646,22.043-124.466l-9.042-19.391l-53.807,53.682 l-24.986-24.941l53.822-53.696L421.17,10.42C379.3-9.036,329.218-0.195,296.546,32.417 c-30.131,30.078-40.012,74.943-26.092,114.534l-20.111,20.086L102.13,18.837C91.061,7.731,76.32,1.605,60.621,1.587 c-0.023,0-0.044,0-0.067,0c-15.696,0-30.45,6.104-41.553,17.195C7.886,29.897,1.77,44.669,1.778,60.378 c0.008,15.697,6.129,30.456,17.233,41.553L167.18,250.094l-20.155,20.129c-39.652-13.917-84.597-4.061-114.733,26.02 C-0.393,328.869-9.252,378.888,10.25,420.708l9.042,19.391l53.806-53.681l24.986,24.94l-53.822,53.697l19.48,9.051 c14.814,6.883,30.652,10.224,46.388,10.224c28.738-0.001,57.124-11.148,78.235-32.221c30.132-30.078,40.013-74.943,26.093-114.534 l51.082-51.018l66.366,66.366l14.229,59.523l76.705,76.706l66.507-66.507L412.642,345.939z M301.691,144.194 c-14.181-30.419-7.73-66.807,16.05-90.545c18.28-18.246,44.036-26.278,68.827-22.6l-42.211,42.113l67.451,67.328l42.24-42.142 c3.697,24.738-4.343,50.456-22.622,68.702c-23.802,23.759-60.288,30.197-90.793,16.02l-9.505-4.417l-34.603,34.559l-24.968-24.965 l34.573-34.529L301.691,144.194z M31.778,60.362c-0.004-7.69,2.992-14.923,8.43-20.362c5.433-5.426,12.657-8.414,20.347-8.414 c7.711,0.009,14.918,3.002,20.345,8.446l194.398,194.38l-40.711,40.659L40.221,80.714C34.781,75.277,31.782,68.049,31.778,60.362z M167.171,430.877c-18.28,18.246-44.038,26.278-68.827,22.6l42.211-42.112l-67.451-67.329l-42.24,42.142 c-3.698-24.737,4.343-50.455,22.623-68.702c23.801-23.758,60.288-30.197,90.792-16.021l9.505,4.417l34.609-34.565l24.967,24.966 l-34.578,34.534l4.44,9.525C197.403,370.751,190.952,407.138,167.171,430.877z M373.342,397.227l-7.564-31.645l31.646,7.564 l49.498,49.499l-24.081,24.081L373.342,397.227z"
                  ></path>
                </g>
              </g>
            </svg>
          </span>
          <span class="nav-label">Proyectos</span>
        </button>
        <button
          class="nav-item"
          :class="{ active: isActive('/disenos') }"
          @click="goTo('/disenos')"
        >
          <span class="nav-icon nav-icon-svg" aria-hidden="true">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="4" />
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
            </svg>
          </span>
          <span class="nav-label">Diseños</span>
        </button>
        <button
          class="nav-item"
          :class="{ active: isActive('/clientes') }"
          @click="goTo('/clientes')"
        >
          <span class="nav-icon nav-icon-svg" aria-hidden="true">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
          <span class="nav-label">Clientes</span>
        </button>
        <button
          class="nav-item"
          :class="{ active: isActive('/productos') }"
          @click="goTo('/productos')"
        >
          <span class="nav-icon nav-icon-svg" aria-hidden="true">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
              />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </span>
          <span class="nav-label">Productos</span>
        </button>
        <button
          class="nav-item"
          :class="{ active: isActive('/inventario') }"
          @click="goTo('/inventario')"
        >
          <span class="nav-icon nav-icon-svg" aria-hidden="true">
            <svg
              class="svg-icon"
              style="
                width: 1.001953125em;
                height: 1em;
                vertical-align: middle;
                fill: currentColor;
                overflow: hidden;
              "
              viewBox="0 0 1026 1024"
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1022.721598 574.002497v-5.113608-1.278402c0-1.278402-1.278402-3.835206-2.556804-5.113608v-1.278402c-1.278402-1.278402-1.278402-2.556804-2.556804-3.835206l-1.278402-1.278402c-1.278402-1.278402-2.556804-2.556804-3.835206-2.556804l-1.278402-1.278402H1009.937578l-230.11236-120.169788V153.40824v-1.278402-5.113608-1.278402c0-1.278402-1.278402-3.835206-2.556804-5.113608v-1.278402c-1.278402-1.278402-1.278402-2.556804-2.556804-3.835206l-1.278402-1.278402c-1.278402-1.278402-2.556804-2.556804-3.835206-2.556804l-1.278402-1.278402H767.041199L524.144819 2.556804s-1.278402 0-1.278402-1.278402c-1.278402 0-1.278402-1.278402-2.556804-1.278402h-15.340824c-1.278402 0-2.556804 1.278402-2.556804 1.278402s-1.278402 0-1.278402 1.278402l-242.89638 127.8402h-1.278402l-1.278401 1.278402c-1.278402 1.278402-2.556804 1.278402-3.835206 2.556804l-1.278402 1.278402c-1.278402 1.278402-2.556804 2.556804-2.556804 3.835206v1.278402c-1.278402 1.278402-1.278402 3.835206-2.556804 5.113608V432.099875L14.062422 552.269663H12.78402l-1.278402 1.278402c-1.278402 1.278402-2.556804 1.278402-3.835206 2.556804l-1.278402 1.278402c-1.278402 1.278402-2.556804 2.556804-2.556804 3.835206v1.278402c-1.278402 1.278402-1.278402 3.835206-2.556804 5.113608V869.313358c0 8.948814 5.113608 17.897628 14.062422 23.011236l242.896379 127.8402c1.278402 0 2.556804 1.278402 3.835206 1.278402 1.278402 0 1.278402 0 2.556804 1.278402 2.556804 0 3.835206 1.278402 6.39201 1.278402s3.835206 0 6.39201-1.278402c1.278402 0 1.278402 0 2.556804-1.278402 1.278402 0 2.556804-1.278402 3.835206-1.278402L511.360799 898.716604l231.390762 121.44819c1.278402 0 2.556804 1.278402 3.835206 1.278402 1.278402 0 1.278402 0 2.556804 1.278402 2.556804 0 3.835206 1.278402 6.39201 1.278402s3.835206 0 6.39201-1.278402c1.278402 0 1.278402 0 2.556804-1.278402 1.278402 0 2.556804-1.278402 3.835205-1.278402l242.89638-127.8402c8.948814-3.835206 14.062422-12.78402 14.062422-23.011236L1022.721598 574.002497c0 1.278402 0 0 0 0z m-268.464419 99.715356L566.332085 575.280899 754.257179 476.843945 942.182272 575.280899 754.257179 673.717853z m-485.79276 0L80.539326 575.280899 268.464419 476.843945 456.389513 575.280899 268.464419 673.717853zM511.360799 54.971286L699.285893 153.40824 511.360799 251.845194 323.435705 153.40824 511.360799 54.971286z m-25.56804 478.122347l-191.7603-100.993758V195.595506l191.7603 100.993757v236.50437z m51.13608 0V296.589263l191.7603-100.993757v236.504369l-191.7603 100.993758zM51.13608 617.468165l191.7603 100.993758v236.504369L51.13608 853.972534V617.468165z m242.896379 100.993758l191.7603-100.993758v236.504369l-191.7603 100.993758V718.461923z m242.89638-100.993758l191.7603 100.993758v236.504369l-191.7603-100.993758V617.468165z m434.656679 236.504369l-191.7603 100.993758V718.461923l191.7603-100.993758v236.504369z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span class="nav-label">Inventario</span>
        </button>
        <button
          v-if="userStore.isAdmin"
          class="nav-item"
          :class="{ active: isActive('/usuarios') }"
          @click="goTo('/usuarios')"
        >
          <span class="nav-icon nav-icon-svg" aria-hidden="true">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </span>
          <span class="nav-label">Usuarios</span>
        </button>
      </template>

      <!-- Field role navigation (chief / technician) -->
      <template v-else>
        <button
          class="nav-item"
          :class="{ active: isActive('/campo') }"
          @click="goTo('/campo')"
        >
          <span class="nav-icon nav-icon-svg" aria-hidden="true">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </span>
          <span class="nav-label">Campo</span>
        </button>
        <button
          class="nav-item"
          :class="{ active: isActive('/disenos') }"
          @click="goTo('/disenos')"
        >
          <span class="nav-icon nav-icon-svg" aria-hidden="true">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="4" />
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
            </svg>
          </span>
          <span class="nav-label">Diseños</span>
        </button>
        <button
          class="nav-item"
          :class="{ active: route.path.startsWith('/proyectos') }"
          @click="goTo('/proyectos')"
        >
          <span class="nav-icon nav-icon-svg" aria-hidden="true">
            <svg
              fill="#ffffff"
              height="200px"
              width="200px"
              version="1.1"
              id="Layer_1"
              xmlns="http://www.w3.org/2000/svg"
              xmlns:xlink="http://www.w3.org/1999/xlink"
              viewBox="0 0 489.347 489.347"
              xml:space="preserve"
              stroke="#ffffff"
            >
              <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
              <g
                id="SVGRepo_tracerCarrier"
                stroke-linecap="round"
                stroke-linejoin="round"
              ></g>
              <g id="SVGRepo_iconCarrier">
                <g>
                  <path
                    d="M412.642,345.939l-59.523-14.229l-66.352-66.352l51.12-51.055c11.874,4.167,24.216,6.203,36.499,6.202 c28.736-0.002,57.122-11.149,78.233-32.221c32.686-32.626,41.544-82.646,22.043-124.466l-9.042-19.391l-53.807,53.682 l-24.986-24.941l53.822-53.696L421.17,10.42C379.3-9.036,329.218-0.195,296.546,32.417 c-30.131,30.078-40.012,74.943-26.092,114.534l-20.111,20.086L102.13,18.837C91.061,7.731,76.32,1.605,60.621,1.587 c-0.023,0-0.044,0-0.067,0c-15.696,0-30.45,6.104-41.553,17.195C7.886,29.897,1.77,44.669,1.778,60.378 c0.008,15.697,6.129,30.456,17.233,41.553L167.18,250.094l-20.155,20.129c-39.652-13.917-84.597-4.061-114.733,26.02 C-0.393,328.869-9.252,378.888,10.25,420.708l9.042,19.391l53.806-53.681l24.986,24.94l-53.822,53.697l19.48,9.051 c14.814,6.883,30.652,10.224,46.388,10.224c28.738-0.001,57.124-11.148,78.235-32.221c30.132-30.078,40.013-74.943,26.093-114.534 l51.082-51.018l66.366,66.366l14.229,59.523l76.705,76.706l66.507-66.507L412.642,345.939z M301.691,144.194 c-14.181-30.419-7.73-66.807,16.05-90.545c18.28-18.246,44.036-26.278,68.827-22.6l-42.211,42.113l67.451,67.328l42.24-42.142 c3.697,24.738-4.343,50.456-22.622,68.702c-23.802,23.759-60.288,30.197-90.793,16.02l-9.505-4.417l-34.603,34.559l-24.968-24.965 l34.573-34.529L301.691,144.194z M31.778,60.362c-0.004-7.69,2.992-14.923,8.43-20.362c5.433-5.426,12.657-8.414,20.347-8.414 c7.711,0.009,14.918,3.002,20.345,8.446l194.398,194.38l-40.711,40.659L40.221,80.714C34.781,75.277,31.782,68.049,31.778,60.362z M167.171,430.877c-18.28,18.246-44.038,26.278-68.827,22.6l42.211-42.112l-67.451-67.329l-42.24,42.142 c-3.698-24.737,4.343-50.455,22.623-68.702c23.801-23.758,60.288-30.197,90.792-16.021l9.505,4.417l34.609-34.565l24.967,24.966 l-34.578,34.534l4.44,9.525C197.403,370.751,190.952,407.138,167.171,430.877z M373.342,397.227l-7.564-31.645l31.646,7.564 l49.498,49.499l-24.081,24.081L373.342,397.227z"
                  ></path>
                </g>
              </g>
            </svg>
          </span>
          <span class="nav-label">Proyectos</span>
        </button>
        <button
          class="nav-item"
          :class="{ active: isActive('/inventario') }"
          @click="goTo('/inventario')"
        >
          <span class="nav-icon nav-icon-svg" aria-hidden="true">
            <svg
              class="svg-icon"
              style="
                width: 1.001953125em;
                height: 1em;
                vertical-align: middle;
                fill: currentColor;
                overflow: hidden;
              "
              viewBox="0 0 1026 1024"
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1022.721598 574.002497v-5.113608-1.278402c0-1.278402-1.278402-3.835206-2.556804-5.113608v-1.278402c-1.278402-1.278402-1.278402-2.556804-2.556804-3.835206l-1.278402-1.278402c-1.278402-1.278402-2.556804-2.556804-3.835206-2.556804l-1.278402-1.278402H1009.937578l-230.11236-120.169788V153.40824v-1.278402-5.113608-1.278402c0-1.278402-1.278402-3.835206-2.556804-5.113608v-1.278402c-1.278402-1.278402-1.278402-2.556804-2.556804-3.835206l-1.278402-1.278402c-1.278402-1.278402-2.556804-2.556804-3.835206-2.556804l-1.278402-1.278402H767.041199L524.144819 2.556804s-1.278402 0-1.278402-1.278402c-1.278402 0-1.278402-1.278402-2.556804-1.278402h-15.340824c-1.278402 0-2.556804 1.278402-2.556804 1.278402s-1.278402 0-1.278402 1.278402l-242.89638 127.8402h-1.278402l-1.278401 1.278402c-1.278402 1.278402-2.556804 1.278402-3.835206 2.556804l-1.278402 1.278402c-1.278402 1.278402-2.556804 2.556804-2.556804 3.835206v1.278402c-1.278402 1.278402-1.278402 3.835206-2.556804 5.113608V432.099875L14.062422 552.269663H12.78402l-1.278402 1.278402c-1.278402 1.278402-2.556804 1.278402-3.835206 2.556804l-1.278402 1.278402c-1.278402 1.278402-2.556804 2.556804-2.556804 3.835206v1.278402c-1.278402 1.278402-1.278402 3.835206-2.556804 5.113608V869.313358c0 8.948814 5.113608 17.897628 14.062422 23.011236l242.896379 127.8402c1.278402 0 2.556804 1.278402 3.835206 1.278402 1.278402 0 1.278402 0 2.556804 1.278402 2.556804 0 3.835206 1.278402 6.39201 1.278402s3.835206 0 6.39201-1.278402c1.278402 0 1.278402 0 2.556804-1.278402 1.278402 0 2.556804-1.278402 3.835206-1.278402L511.360799 898.716604l231.390762 121.44819c1.278402 0 2.556804 1.278402 3.835206 1.278402 1.278402 0 1.278402 0 2.556804 1.278402 2.556804 0 3.835206 1.278402 6.39201 1.278402s3.835206 0 6.39201-1.278402c1.278402 0 1.278402 0 2.556804-1.278402 1.278402 0 2.556804-1.278402 3.835205-1.278402l242.89638-127.8402c8.948814-3.835206 14.062422-12.78402 14.062422-23.011236L1022.721598 574.002497c0 1.278402 0 0 0 0z m-268.464419 99.715356L566.332085 575.280899 754.257179 476.843945 942.182272 575.280899 754.257179 673.717853z m-485.79276 0L80.539326 575.280899 268.464419 476.843945 456.389513 575.280899 268.464419 673.717853zM511.360799 54.971286L699.285893 153.40824 511.360799 251.845194 323.435705 153.40824 511.360799 54.971286z m-25.56804 478.122347l-191.7603-100.993758V195.595506l191.7603 100.993757v236.50437z m51.13608 0V296.589263l191.7603-100.993757v236.504369l-191.7603 100.993758zM51.13608 617.468165l191.7603 100.993758v236.504369L51.13608 853.972534V617.468165z m242.896379 100.993758l191.7603-100.993758v236.504369l-191.7603 100.993758V718.461923z m242.89638-100.993758l191.7603 100.993758v236.504369l-191.7603-100.993758V617.468165z m434.656679 236.504369l-191.7603 100.993758V718.461923l191.7603-100.993758v236.504369z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span class="nav-label">Inventario</span>
        </button>
      </template>
    </nav>

    <div class="sidebar-footer">
      <div class="user-info">
        <img
          v-if="avatarSrc && !avatarImgError"
          :src="avatarSrc"
          :alt="userStore.displayName || 'Usuario'"
          class="user-avatar-small"
          referrerpolicy="no-referrer"
          @load="onAvatarLoad"
          @error="onAvatarError"
        />
        <div v-else class="user-avatar-placeholder-small">
          {{ userInitial }}
        </div>
        <div class="user-details">
          <p class="user-name">
            {{ userStore.displayName || userStore.user?.email }}
          </p>
          <p class="user-email-small">{{ userStore.user?.email }}</p>
        </div>
      </div>
      <button @click="handleLogout" class="logout-button">Cerrar Sesión</button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore, isDevAuthBypass } from "../stores/index";
import { useApi } from "../composables/useApi";
import { useToastStore } from "../stores/toast";

const props = defineProps<{
  mobileOpen?: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const api = useApi();
const toastStore = useToastStore();
const { logout } = userStore;

const mobileOpen = computed(() => !!props.mobileOpen);

const avatarImgError = ref(false);
/** Avatar image src: blob URL (when proxied from Google) or direct photoURL */
const avatarSrc = ref<string | null>(null);

const isGooglePhoto = (url: string | null | undefined) =>
  !!url && url.includes("lh3.googleusercontent.com");

function revokeAvatarBlob() {
  if (avatarSrc.value?.startsWith("blob:")) {
    URL.revokeObjectURL(avatarSrc.value);
  }
  avatarSrc.value = null;
}

async function loadAvatar() {
  revokeAvatarBlob();
  avatarImgError.value = false;
  const photoURL = userStore.photoURL;
  if (!photoURL) return;

  if (isGooglePhoto(photoURL)) {
    try {
      const blob = await api.getBlob("/api/users/me/avatar");
      avatarSrc.value = URL.createObjectURL(blob);
    } catch {
      avatarImgError.value = true;
    }
  } else {
    avatarSrc.value = photoURL;
  }
}

watch(
  () => userStore.photoURL,
  (url) => {
    if (!url) {
      revokeAvatarBlob();
      return;
    }
    loadAvatar();
  },
  { immediate: true },
);

onUnmounted(() => {
  revokeAvatarBlob();
});

function onAvatarLoad() {
  if (import.meta.env.DEV) console.log("[Sidebar Avatar] Image loaded OK");
}
function onAvatarError() {
  if (import.meta.env.DEV)
    console.warn("[Sidebar Avatar] Image failed to load");
  avatarImgError.value = true;
}

onMounted(() => {
  userStore.fetchProfile();
});

const userInitial = computed(() => {
  const name = userStore.displayName;
  if (name?.length) return name.charAt(0).toUpperCase();
  if (userStore.user?.email)
    return userStore.user.email.charAt(0).toUpperCase();
  return "?";
});

const handleLogout = async () => {
  if (isDevAuthBypass) {
    toastStore.show(
      "Quita VITE_DEV_BYPASS_AUTH del .env para cerrar sesión con Firebase.",
      "info",
    );
    return;
  }
  await logout();
  router.push("/login");
};

const isActive = (path: string) => route.path === path;

const goTo = (path: string) => {
  emit("close");
  if (route.path !== path) {
    router.push(path);
  }
};

watch(
  () => route.fullPath,
  () => {
    emit("close");
  },
);
</script>

<style scoped>
/* Sidebar - 1/5 width */
.sidebar {
  width: 20%;
  min-width: 0;
  min-height: 0;
  align-self: stretch;
  background: #053f51;
  border-right: none;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  flex-shrink: 0;
  padding: 1.5rem 1.5rem 2rem 1.5rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.sidebar-close-btn {
  display: none;
}

.sidebar-logo {
  width: 140px;
  height: auto;
  display: block;
  object-fit: contain;
}

.sidebar-nav {
  flex: 1 1 auto;
  min-height: 0;
  padding: 1rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

.nav-item {
  width: 100%;
  padding: 0.9rem 1.1rem;
  background: #053f51;
  border: 1px solid transparent;
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition:
    background 0.2s,
    border-color 0.2s,
    box-shadow 0.2s,
    transform 0.15s ease-out;
  color: #e2e8f0;
  font-size: 1rem;
  outline: none;
  transform: translateY(0);
}

.nav-item:hover,
.nav-item:focus,
.nav-item:focus-visible {
  background: #06475b;
  border-color: rgba(148, 163, 184, 0.6);
  outline: none;
  transform: translateY(-1px);
}

.nav-item.active {
  background: #0f9f70;
  border-color: #0f9f70;
  color: white;
  font-weight: 500;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
}

.nav-icon {
  font-size: 1.25rem;
}

.nav-icon-svg {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: inherit;
}

.nav-icon-svg svg {
  width: 1.25rem;
  height: 1.25rem;
}

.nav-label {
  flex: 1;
}

.sidebar-footer {
  flex-shrink: 0;
  padding: 1.5rem;
  padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid rgba(148, 163, 184, 0.25);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.user-avatar-small {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.user-avatar-placeholder-small {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #0f9f70;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: bold;
  flex-shrink: 0;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-name {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #f9fafb;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email-small {
  margin: 0.25rem 0 0 0;
  font-size: 0.75rem;
  color: #cbd5f5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-button {
  width: 100%;
  padding: 0.75rem;
  background: transparent;
  color: #fee2e2;
  border: 1px solid rgba(248, 113, 113, 0.7);
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.logout-button:hover {
  background: rgba(248, 113, 113, 0.15);
}

@media (max-width: 860px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 60;
    width: min(20rem, 86vw);
    height: 100%;
    max-height: none;
    border-right: none;
    border-bottom: none;
    transform: translateX(-100%);
    transition: transform 0.22s ease;
    pointer-events: none;
    box-shadow: none;
  }

  .sidebar--mobile-open {
    transform: translateX(0);
    pointer-events: auto;
    box-shadow: 8px 0 24px rgba(15, 23, 42, 0.25);
  }

  .sidebar-header {
    justify-content: flex-start;
    padding: 1rem 1rem 1.25rem 1rem;
    padding-top: calc(1rem + env(safe-area-inset-top, 0px));
  }

  .sidebar-close-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: calc(0.85rem + env(safe-area-inset-top, 0px));
    right: 0.75rem;
    width: 2.25rem;
    height: 2.25rem;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #f9fafb;
    font-size: 1.15rem;
    line-height: 1;
    cursor: pointer;
  }

  .sidebar-close-btn:hover,
  .sidebar-close-btn:focus-visible {
    background: #06475b;
    outline: none;
  }

  .sidebar-logo {
    width: 65px;
  }

  .sidebar-nav {
    padding: 0.75rem 1rem;
  }

  .nav-item {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }

  .sidebar-footer {
    padding: 1rem;
  }
}
</style>
