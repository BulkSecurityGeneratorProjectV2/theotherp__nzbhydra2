package org.nzbhydra.downloading;

import org.junit.Test;
import org.mockito.InjectMocks;
import org.nzbhydra.downloading.downloaders.NzbGet;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;

public class NzbGetTest {
    @InjectMocks
    private NzbGet testee = new NzbGet();

    @Test
    public void intialize() throws Throwable {
        String originalUrl = "http://nzbget:nzbget?@127.0.0.1:6789/jsonrpc";
        System.out.println(originalUrl);

//        URL url = new URL(originalUrl);
//        System.out.println(url);

        URI builtUri = UriComponentsBuilder.fromHttpUrl(originalUrl).build().toUri();
        System.out.println(builtUri.toString());

        //        Map<String, String> headers = new HashMap<>();
//        headers.put("Authorization",  "Basic " + BaseEncoding.base64().encode("nzbget:nzbget?:".getBytes()));
//        new JsonRpcHttpClient(url, headers).invoke("writelog", new Object[]{"INFO", "NZBHydra connected to test connection"}, String.class);

//        DownloaderConfig config = new DownloaderConfig();
//        config.setUrl("http://127.0.0.1:6789");
//        config.setUsername("nzbget");
//        config.setPassword("");
//        testee.intialize(config);
//        testee.getHistory(Instant.now());
    }


}
