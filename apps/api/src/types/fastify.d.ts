import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    hostelId: string;
    userId: string;
    userRole: string;
  }
}