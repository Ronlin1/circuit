export class SseHub {
  #clients = new Set();
  connect(res) {
    res.writeHead(200, {'content-type':'text/event-stream','cache-control':'no-cache','connection':'keep-alive'});
    res.write(': CIRCUIT event stream\n\n');
    this.#clients.add(res);
    res.on('close',()=>this.#clients.delete(res));
  }
  publish(type,data) {
    const payload=`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
    for(const client of this.#clients) client.write(payload);
  }
  close(){ for(const client of this.#clients) client.end(); this.#clients.clear(); }
}
