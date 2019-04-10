package org.nzbhydra.migration;

import org.junit.Test;
import org.mockito.InjectMocks;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.MainConfig;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.config.category.CategoriesConfig;
import org.nzbhydra.config.downloading.ProxyType;
import org.nzbhydra.migration.configmapping.*;

import java.util.*;
import java.util.stream.Collectors;

import static org.hamcrest.Matchers.*;
import static org.junit.Assert.assertThat;

public class JsonConfigMigrationTest {

    @InjectMocks
    private JsonConfigMigration testee = new JsonConfigMigration();

    @Test
    public void shouldMigrateProxies() throws Exception {
        Main oldMain = new Main();
        oldMain.setHttpProxy("http://www.httpproxy.com:123");
        oldMain.setHttpsProxy("http://www.httpsproxy.com:123");
        oldMain.setSocksProxy("http://www.socksproxy.com:456");
        MainConfig newMain = new MainConfig();
        ArrayList<String> messages = new ArrayList<>();
        testee.migrateProxies(messages, newMain, oldMain);

        assertThat(newMain.getProxyType(), is(ProxyType.SOCKS));
        assertThat(messages.get(0), containsString("Both SOCKS and HTTP(s) proxy are set. Using SOCKS proxy only."));

        oldMain.setSocksProxy(null);
        messages.clear();
        testee.migrateProxies(messages, newMain, oldMain);
        assertThat(newMain.getProxyType(), is(ProxyType.HTTP));
        assertThat(messages.get(0), containsString("Both HTTP and HTTPS proxy are set. Using HTTPS proxy for both HTTP and HTTPS"));
    }

    @Test
    public void shouldMigrateCategories() throws Exception {
        Categories oldCategories = new Categories();
        oldCategories.setEnableCategorySizes(true);
        Map<String, Category> categoryMap = new HashMap<>();
        Category oldCat = new Category();
        oldCat.setApplyRestrictions("internal");
        oldCat.setForbiddenRegex("someForbiddenRegex");
        oldCat.setForbiddenWords(Arrays.asList("some", "forbidden", "words"));
        oldCat.setMin(100);
        oldCat.setMax(1000);
        oldCat.setRequiredRegex("someRequiredRegex");
        oldCat.setRequiredWords(Arrays.asList("some", "required", "words"));
        oldCat.setIgnoreResults("external");
        oldCat.setNewznabCategories(Arrays.asList(1000, 2000));
        categoryMap.put("category", oldCat);
        oldCategories.setCategories(categoryMap);

        CategoriesConfig newCategories = new CategoriesConfig();
        org.nzbhydra.config.category.Category newCategory = new org.nzbhydra.config.category.Category("Category");
        newCategories.setCategories(Arrays.asList(newCategory));
        testee.migrateCategories(oldCategories, newCategories);

        assertThat(newCategories.isEnableCategorySizes(), is(true));
        assertThat(newCategories.getCategories(), hasSize(1));
        org.nzbhydra.config.category.Category category = newCategories.getCategories().get(0);
        List<Integer> collect = category.getNewznabCategories().stream().map(x -> x.get(0)).collect(Collectors.toList());
        assertThat(collect, equalTo(Arrays.asList(1000, 2000)));
        assertThat(category.getApplyRestrictionsType(), is(SearchSourceRestriction.INTERNAL));
        assertThat(category.getIgnoreResultsFrom(), is(SearchSourceRestriction.API));
        assertThat(category.getForbiddenRegex().get(), is("someForbiddenRegex"));
        assertThat(category.getForbiddenWords(), equalTo(Arrays.asList("some", "forbidden", "words")));
        assertThat(category.getRequiredRegex().get(), is("someRequiredRegex"));
        assertThat(category.getRequiredWords(), equalTo(Arrays.asList("some", "required", "words")));
        assertThat(category.getMinSizePreset().get(), is(100));
        assertThat(category.getMaxSizePreset().get(), is(1000));


        oldCat.setApplyRestrictions("both");
        oldCat.setIgnoreResults("always");
        testee.migrateCategories(oldCategories, newCategories);
        category = newCategories.getCategories().get(0);
        assertThat(category.getApplyRestrictionsType(), is(SearchSourceRestriction.BOTH));
        assertThat(category.getIgnoreResultsFrom(), is(SearchSourceRestriction.BOTH));


        oldCat.setApplyRestrictions("never");
        oldCat.setIgnoreResults("never");
        oldCat.setMin(null);
        oldCat.setMax(null);
        oldCat.setRequiredRegex(null);
        oldCat.setRequiredWords(Collections.emptyList());
        oldCat.setForbiddenRegex(null);
        oldCat.setForbiddenWords(null);
        testee.migrateCategories(oldCategories, newCategories);
        category = newCategories.getCategories().get(0);
        assertThat(category.getForbiddenRegex().isPresent(), is(false));
        assertThat(category.getForbiddenWords(), hasSize(0));
        assertThat(category.getRequiredRegex().isPresent(), is(false));
        assertThat(category.getRequiredWords(), hasSize(0));
        assertThat(category.getMinSizePreset(), is(Optional.empty()));
        assertThat(category.getMaxSizePreset(), is(Optional.empty()));
    }

    @Test
    public void shouldNotMakeNonNewznabIndexersYellow() {
        Indexer binsearch = new Indexer();
        binsearch.setType("BINSEARCH");
        binsearch.setEnabled(true);
        Indexer nzbindex = new Indexer();
        nzbindex.setType("NZBINDEX");
        nzbindex.setEnabled(true);
        Indexer anizb = new Indexer();
        anizb.setType("ANIZB");
        anizb.setEnabled(true);
        OldConfig oldConfig = new OldConfig();
        oldConfig.setIndexers(Arrays.asList(binsearch, nzbindex, anizb));

        BaseConfig newConfig = new BaseConfig();
        testee.migrateIndexers(oldConfig, newConfig);

        assertThat(newConfig.getIndexers().size(), is(3));

        assertThat(newConfig.getIndexers().get(0).isConfigComplete(), is(true));
        assertThat(newConfig.getIndexers().get(0).isAllCapsChecked(), is(true));
        assertThat(newConfig.getIndexers().get(1).isConfigComplete(), is(true));
        assertThat(newConfig.getIndexers().get(1).isAllCapsChecked(), is(true));
        assertThat(newConfig.getIndexers().get(2).isConfigComplete(), is(true));
        assertThat(newConfig.getIndexers().get(2).isAllCapsChecked(), is(true));
    }

    @Test
    public void shouldCorrectWrongIndexerLimits() {
        Indexer newznab = new Indexer();
        newznab.setType("NEWZNAB");
        newznab.setHitLimit(0);
        newznab.setDownloadLimit(0);
        newznab.setEnabled(true);
        OldConfig oldConfig = new OldConfig();
        oldConfig.setIndexers(Arrays.asList(newznab));

        BaseConfig newConfig = new BaseConfig();
        testee.migrateIndexers(oldConfig, newConfig);

        assertThat(newConfig.getIndexers().size(), is(1));
        assertThat(newConfig.getIndexers().get(0).getDownloadLimit().isPresent(), is(false));
        assertThat(newConfig.getIndexers().get(0).getHitLimit().isPresent(), is(false));

        newznab.setHitLimit(-1);
        newznab.setDownloadLimit(-99);
        testee.migrateIndexers(oldConfig, newConfig);

        assertThat(newConfig.getIndexers().size(), is(1));
        assertThat(newConfig.getIndexers().get(0).getDownloadLimit().isPresent(), is(false));
        assertThat(newConfig.getIndexers().get(0).getHitLimit().isPresent(), is(false));
    }





}