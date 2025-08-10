import { NextRequest } from 'next/server';
import { WebSocketManager } from '@/lib/websocket';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // This endpoint is for WebSocket upgrade
  // The actual WebSocket handling is done in the WebSocketManager
  return new Response('WebSocket endpoint - use WebSocket connection', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}

// WebSocket upgrade handler
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Get WebSocket manager instance
    const wsManager = WebSocketManager.getInstance();
    
    // Handle WebSocket upgrade
    const { socket, response } = await wsManager.handleUpgrade(request);
    
    if (socket) {
      // Add user info to socket for authentication
      (socket as any).user = session.user;
      (socket as any).userId = session.user.id;
      
      // Handle the WebSocket connection
      wsManager.handleConnection(socket);
    }

    return response;
  } catch (error) {
    console.error('WebSocket upgrade error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}