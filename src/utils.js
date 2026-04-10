import { basename } from 'path'
import { API_ROOT_URL, ROOT_PATH, IMAGE_PATH } from './client_settings'
import { authorizationHeader, get_cruises } from './api'

// This function constructs a URL to an image served by the Sealog server.
// Normally, this should correspond to the server's IMAGE_ROUTE setting
// (defined in routes/default.js).
//
// Override this function to serve images through alternate methods, such as a
// caching proxy.
//
// Credit rgov (WHOIGit/ndsf-sealog-client)
export const getImageUrl = (image_path) => {
  return `${API_ROOT_URL}${IMAGE_PATH}/${basename(image_path)}`
  // return `${API_ROOT_URL}${IMAGE_PATH}${image_path}`<-- WHOI should use this code
}

export const handleMissingImage = (ev) => {
  ev.target.src = `${window.location.protocol}//${window.location.hostname}:${window.location.port}${ROOT_PATH}images/noimage.jpeg`
}

export const toTitlecase = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Resolves the startTS constraint used to scope event queries to the current cruise for non-admin users.
// Returns undefined if roles are not yet available (caller should abort).
// Returns null if the user is an admin (no startTS constraint needed).
// Returns a timestamp string if a cruise boundary was found.
export const resolveStartTS = async (roles) => {
  if (!roles) return undefined
  if (roles.includes('admin')) return null

  const now = new Date().toISOString()
  const cruises = await get_cruises({ startTS: now, stopTS: now })
  if (cruises.length) return cruises[0].start_ts

  const allCruises = await get_cruises()
  if (allCruises.length) return allCruises[allCruises.length - 1].stop_ts

  return null
}

// Connects a @hapi/nes Client and subscribes to the given channels.
// subscriptions: { '/ws/channel': handlerFn, ... }
// Retries with exponential backoff on failure.
export const connectWSClient = async (client, subscriptions, { maxRetries = 3, baseDelay = 500, retryCount = 0 } = {}) => {
  try {
    await client.connect({ auth: authorizationHeader })
    for (const [channel, handler] of Object.entries(subscriptions)) {
      await client.subscribe(channel, handler)
    }
  } catch (error) {
    console.error('Problem connecting to websocket subscriptions')
    console.debug(error)
    if (retryCount >= maxRetries) {
      console.error('Max WS retries exceeded')
      return
    }
    const delay = baseDelay * Math.pow(2, retryCount)
    console.debug(`Retrying websocket in ${delay}ms`)
    await new Promise((resolve) => setTimeout(resolve, delay))
    return connectWSClient(client, subscriptions, { maxRetries, baseDelay, retryCount: retryCount + 1 })
  }
}

// Builds the query object for paginated event fetching.
// eventFilterValue: the active filter string (or null)
// extraFilter: additional fields to merge into the query (e.g. full filter object from event_management)
export const buildEventQuery = ({ startTS, eventFilterValue, hideASNAP, activePage, maxPerPage, extraFilter = {} }) => {
  const filterValue = eventFilterValue || (hideASNAP ? '!ASNAP' : null)
  return {
    startTS,
    ...extraFilter,
    value: filterValue ? filterValue.split(',') : null,
    sort: 'newest',
    offset: (activePage - 1) * maxPerPage,
    limit: maxPerPage
  }
}

export const generateRandomCharacters = (length) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length)
    result += characters[randomIndex]
  }
  return result
}

export const highchartsTheme = {
  colors: ['#2A9FD6', '#77B300', '#9933CC', '#FF8800', '#CC0000'],
  chart: {
    backgroundColor: '#262626',
    plotBorderColor: '#555555'
  },
  xAxis: {
    gridLineColor: '#555555',
    labels: {
      style: {
        color: '#E0E0E3'
      }
    },
    lineColor: '#555555',
    minorGridLineColor: '#505053',
    tickColor: '#555555',
    title: {
      style: {
        color: '#A0A0A3'
      }
    }
  },
  yAxis: {
    gridLineColor: '#555555',
    labels: {
      style: {
        color: '#E0E0E3'
      }
    },
    lineColor: '#555555',
    minorGridLineColor: '#505053',
    tickColor: '#555555',
    tickWidth: 1,
    title: {
      style: {
        color: '#A0A0A3'
      }
    }
  },
  navigation: {
    buttonOptions: {
      symbolStroke: '#555555',
      theme: {
        fill: '#222222'
      }
    }
  }
}
